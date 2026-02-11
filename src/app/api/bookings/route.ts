import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { createCalendarEvent, hasCalendarConflict, getGoogleAccessToken, BookingData } from "@/lib/calendar"
import { sendBookingEmails } from "@/lib/email"
import { triggerWebhook } from "@/lib/webhooks"
import { executeWorkflow } from "@/lib/workflows"
import { getNextRoundRobinMember, updateLastAssignedMember, createCollectiveBooking } from "@/lib/team-scheduling"
import { bookingLogger, apiLogger } from "@/lib/logger"
import { z } from "zod"

const createBookingSchema = z.object({
  eventTypeId: z.string().min(1),
  guestName: z.string().min(1).max(200).trim(),
  guestEmail: z.string().email().max(320),
  guestTimezone: z.string().max(100).optional(),
  notes: z.string().max(2000).optional().nullable().transform(v => v ?? undefined),
  date: z.string().optional(),
  time: z.string().optional(),
  startTime: z.string().optional(),
  recurrenceRule: z.string().optional(), // e.g. "weekly_4", "weekly_8", "biweekly_4", "monthly_3"
  customAnswers: z.string().optional(), // JSON object of custom question answers
})
import { bookingRateLimiter, getClientIp } from "@/lib/rate-limit"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      apiLogger.warn("Unauthorized access attempt to bookings list")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    apiLogger.debug("Fetching bookings", { visitorId: session.user.id })

    const bookings = await prisma.booking.findMany({
      where: { hostId: session.user.id },
      include: {
        eventType: {
          select: { title: true, duration: true, color: true },
        },
        recurrenceChildren: {
          select: { id: true, startTime: true, endTime: true, status: true },
          orderBy: { startTime: "asc" },
        },
      },
      orderBy: { startTime: "desc" },
    })

    apiLogger.debug("Bookings fetched", { visitorId: session.user.id, count: bookings.length })
    return NextResponse.json(bookings)
  } catch (error) {
    apiLogger.error("Error fetching bookings", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)

  // Rate limit: 5 bookings per IP per hour
  const ip = getClientIp(request)
  const rl = bookingRateLimiter.check(ip)
  if (!rl.allowed) {
    bookingLogger.warn("Rate limit exceeded", { requestId, ip })
    return NextResponse.json(
      { error: "Too many booking requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) {
      bookingLogger.warn("Validation failed", { requestId, errors: parsed.error.flatten() })
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const { eventTypeId, guestName, guestEmail, guestTimezone, date, time, startTime: startTimeISO, recurrenceRule } = parsed.data

    bookingLogger.info("Booking request received", { 
      requestId,
      eventTypeId, 
      guestEmail, 
      date, 
      time,
      hasStartTimeISO: !!startTimeISO 
    })

    if (!startTimeISO && (!date || !time)) {
      bookingLogger.warn("Missing required fields", { requestId, eventTypeId, guestName: !!guestName, guestEmail: !!guestEmail })
      return NextResponse.json({ error: "Missing required fields: provide startTime or date+time" }, { status: 400 })
    }

    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            timezone: true,
            calendarSyncEnabled: true,
          },
        },
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    timezone: true,
                    calendarSyncEnabled: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!eventType || !eventType.isActive) {
      bookingLogger.warn("Event type not found or inactive", { requestId, eventTypeId })
      return NextResponse.json({ error: "Event type not found or inactive" }, { status: 404 })
    }

    // Parse start time (supports both ISO string or date+time)
    let startTime: Date
    if (startTimeISO) {
      startTime = new Date(startTimeISO)
    } else if (date && time) {
      const [hour, minute] = time.split(":").map(Number)
      startTime = dateFns.setMinutes(
        dateFns.setHours(dateFns.parse(date, "yyyy-MM-dd", new Date()), hour),
        minute
      )
    } else {
      return NextResponse.json({ error: "Either startTime or date+time must be provided" }, { status: 400 })
    }
    const endTime = dateFns.addMinutes(startTime, eventType.duration)

    bookingLogger.debug("Parsed booking time", { 
      requestId, 
      startTime: startTime.toISOString(), 
      endTime: endTime.toISOString() 
    })

    // Validate booking time
    const now = new Date()
    const minBookingTime = dateFns.addMinutes(now, eventType.minNotice)
    if (dateFns.isBefore(startTime, minBookingTime)) {
      bookingLogger.warn("Booking time too soon", { requestId, startTime: startTime.toISOString(), minNotice: eventType.minNotice })
      return NextResponse.json({ error: "This time slot is no longer available. Please select a later time." }, { status: 400 })
    }

    // Handle team bookings
    if (eventType.teamId && eventType.team) {
      bookingLogger.info("Processing team booking", { requestId, teamId: eventType.teamId, schedulingType: eventType.schedulingType })
      
      if (eventType.schedulingType === "COLLECTIVE") {
        // Collective: create bookings for all team members
        const bookingIds = await createCollectiveBooking(
          eventTypeId,
          eventType.teamId,
          guestName,
          guestEmail,
          guestTimezone || "UTC",
          startTime,
          endTime
        )

        bookingLogger.info("Collective booking created", { requestId, bookingIds, teamName: eventType.team.name })

        // Create calendar events for all team members asynchronously
        for (const member of eventType.team.members) {
          if (member.user.calendarSyncEnabled) {
            getGoogleAccessToken(member.userId).then(async (accessToken) => {
              if (accessToken) {
                const bookingData: BookingData = {
                  id: bookingIds[0],
                  guestName,
                  guestEmail,
                  startTime,
                  endTime,
                  eventType: {
                    title: eventType.title,
                    description: eventType.description,
                    location: eventType.location,
                    locationType: eventType.locationType,
                    locationValue: eventType.locationValue,
                  },
                  host: {
                    name: member.user.name,
                    email: member.user.email,
                  },
                }
                await createCalendarEvent(accessToken, bookingData)
                bookingLogger.debug("Calendar event created for team member", { bookingId: bookingIds[0], memberId: member.userId })
              }
            }).catch((err) => {
              bookingLogger.error("Calendar event creation failed for team member", err, { bookingId: bookingIds[0], memberId: member.userId })
            })
          }
        }

        return NextResponse.json({ 
          success: true, 
          bookingIds,
          schedulingType: "COLLECTIVE",
          teamName: eventType.team.name,
        }, { status: 201 })
      } else if (eventType.schedulingType === "ROUND_ROBIN") {
        // Round-robin: find next available member
        const assignedMemberId = await getNextRoundRobinMember(
          eventType.teamId,
          startTime,
          endTime,
          eventType.bufferBefore,
          eventType.bufferAfter
        )

        if (!assignedMemberId) {
          bookingLogger.warn("No team members available for round-robin", { requestId, teamId: eventType.teamId })
          return NextResponse.json({ error: "No team members available at this time. Please try a different slot." }, { status: 409 })
        }

        // Create booking for the assigned member
        const assignedMember = eventType.team.members.find((m) => m.userId === assignedMemberId)
        
        const booking = await prisma.booking.create({
          data: {
            eventTypeId,
            hostId: assignedMemberId,
            guestName,
            guestEmail,
            guestTimezone: guestTimezone || "UTC",
            startTime,
            endTime,
            status: "CONFIRMED",
          },
          include: {
            eventType: true,
            host: { select: { name: true, email: true, timezone: true } },
          },
        })

        bookingLogger.info("Round-robin booking created", { 
          requestId, 
          bookingId: booking.id, 
          assignedMemberId,
          teamName: eventType.team.name 
        })

        // Update round-robin tracker
        await updateLastAssignedMember(eventType.teamId, assignedMemberId)

        // Create Google Calendar event for the assigned member
        if (assignedMember?.user.calendarSyncEnabled) {
          getGoogleAccessToken(assignedMemberId).then(async (accessToken) => {
            if (accessToken) {
              const bookingData: BookingData = {
                id: booking.id,
                guestName: booking.guestName,
                guestEmail: booking.guestEmail,
                startTime: booking.startTime,
                endTime: booking.endTime,
                eventType: {
                  title: booking.eventType.title,
                  description: booking.eventType.description,
                  location: booking.eventType.location,
                  locationType: eventType.locationType,
                  locationValue: eventType.locationValue,
                },
                host: {
                  name: booking.host.name,
                  email: booking.host.email,
                },
              }
              const result = await createCalendarEvent(accessToken, bookingData)
              
              const updateData: { googleEventId?: string; meetingUrl?: string } = {}
              if (result.googleEventId) {
                updateData.googleEventId = result.googleEventId
              }
              if (result.meetingUrl) {
                updateData.meetingUrl = result.meetingUrl
              }
              
              if (Object.keys(updateData).length > 0) {
                await prisma.booking.update({
                  where: { id: booking.id },
                  data: updateData,
                })
                bookingLogger.debug("Calendar event created", { bookingId: booking.id, googleEventId: result.googleEventId })
              }
            }
          }).catch((err) => {
            bookingLogger.error("Calendar event creation failed", err, { bookingId: booking.id })
          })
        }

        // Trigger webhook for round-robin booking
        triggerWebhook(assignedMemberId, "booking.created", {
          booking: {
            id: booking.id,
            eventType: {
              id: booking.eventType.id,
              title: booking.eventType.title,
              duration: booking.eventType.duration,
            },
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            guestTimezone: booking.guestTimezone,
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
            status: booking.status,
            createdAt: booking.createdAt.toISOString(),
            schedulingType: "ROUND_ROBIN",
            teamName: eventType.team.name,
          },
          host: {
            id: assignedMemberId,
            name: assignedMember?.user.name || null,
            email: assignedMember?.user.email || "",
          },
        }).catch((err) => {
          bookingLogger.error("Webhook trigger failed", err, { bookingId: booking.id })
        })

        return NextResponse.json({
          ...booking,
          schedulingType: "ROUND_ROBIN",
          teamName: eventType.team.name,
        }, { status: 201 })
      }
    }

    // Standard individual booking
    bookingLogger.debug("Processing individual booking", { requestId, hostId: eventType.userId })

    // Helper: generate recurring dates from a rule
    function generateRecurringDates(baseStart: Date, baseEnd: Date, rule: string): { start: Date; end: Date }[] {
      const dates: { start: Date; end: Date }[] = []
      const [freq, countStr] = rule.split("_")
      const count = parseInt(countStr, 10)
      if (!count || count < 1 || count > 12) return dates
      for (let i = 1; i < count; i++) {
        let nextStart: Date
        let nextEnd: Date
        if (freq === "weekly") {
          nextStart = dateFns.addWeeks(baseStart, i)
          nextEnd = dateFns.addWeeks(baseEnd, i)
        } else if (freq === "biweekly") {
          nextStart = dateFns.addWeeks(baseStart, i * 2)
          nextEnd = dateFns.addWeeks(baseEnd, i * 2)
        } else if (freq === "monthly") {
          nextStart = dateFns.addMonths(baseStart, i)
          nextEnd = dateFns.addMonths(baseEnd, i)
        } else {
          break
        }
        dates.push({ start: nextStart, end: nextEnd })
      }
      return dates
    }

    // If recurring, validate that the event type allows it and check all slots
    let recurringDates: { start: Date; end: Date }[] = []
    if (recurrenceRule) {
      if (!eventType.allowRecurring) {
        return NextResponse.json({ error: "This event type does not allow recurring bookings." }, { status: 400 })
      }
      // Validate allowed options
      const allowedOptions: string[] = eventType.recurrenceOptions ? JSON.parse(eventType.recurrenceOptions) : ["weekly_4", "weekly_8", "biweekly_4", "monthly_3"]
      if (!allowedOptions.includes(recurrenceRule)) {
        return NextResponse.json({ error: "Invalid recurrence option." }, { status: 400 })
      }
      recurringDates = generateRecurringDates(startTime, endTime, recurrenceRule)
    }

    // Check for conflicts on all dates (primary + recurring)
    const allSlots = [{ start: startTime, end: endTime }, ...recurringDates]
    for (const slot of allSlots) {
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          hostId: eventType.userId,
          status: { not: "CANCELLED" },
          OR: [
            { startTime: { lt: slot.end }, endTime: { gt: slot.start } },
          ],
        },
      })
      if (conflictingBooking) {
        bookingLogger.warn("Time slot conflict detected", { requestId, conflictingBookingId: conflictingBooking.id, slotStart: slot.start.toISOString() })
        return NextResponse.json({ error: `Time slot on ${dateFns.format(slot.start, "MMM d, yyyy")} at ${dateFns.format(slot.start, "HH:mm")} is no longer available.` }, { status: 409 })
      }
    }

    // Check Google Calendar for conflicts on all dates
    for (const slot of allSlots) {
      const hasGCalConflict = await hasCalendarConflict(eventType.userId, slot.start, slot.end)
      if (hasGCalConflict) {
        bookingLogger.warn("Google Calendar conflict detected", { requestId, slotStart: slot.start.toISOString() })
        return NextResponse.json({ error: `Time on ${dateFns.format(slot.start, "MMM d, yyyy")} conflicts with an existing calendar event.` }, { status: 409 })
      }
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        eventTypeId,
        hostId: eventType.userId,
        guestName,
        guestEmail,
        guestTimezone: guestTimezone || "UTC",
        startTime,
        endTime,
        status: "CONFIRMED",
        recurrenceRule: recurrenceRule || null,
      },
      include: {
        eventType: true,
        host: { select: { name: true, email: true, timezone: true } },
      },
    })

    // Create child bookings for recurring series
    const childBookings: typeof booking[] = []
    if (recurrenceRule && recurringDates.length > 0) {
      for (const slot of recurringDates) {
        const child = await prisma.booking.create({
          data: {
            eventTypeId,
            hostId: eventType.userId,
            guestName,
            guestEmail,
            guestTimezone: guestTimezone || "UTC",
            startTime: slot.start,
            endTime: slot.end,
            status: "CONFIRMED",
            recurrenceRule,
            recurrenceParentId: booking.id,
          },
          include: {
            eventType: true,
            host: { select: { name: true, email: true, timezone: true } },
          },
        })
        childBookings.push(child)
      }
      bookingLogger.info("Recurring series created", { requestId, parentId: booking.id, childCount: childBookings.length })
    }

    // Store all bookings (parent + children) for calendar event creation
    const allBookings = [booking, ...childBookings]

    bookingLogger.info("Booking created successfully", { 
      requestId, 
      bookingId: booking.id, 
      guestEmail,
      startTime: startTime.toISOString() 
    })

    // Determine meeting URL based on location type
    let meetingUrl: string | null = null
    
    // For custom URLs (Zoom, custom), use the locationValue immediately
    if (eventType.locationType === "ZOOM" || eventType.locationType === "CUSTOM") {
      meetingUrl = eventType.locationValue || null
    } else if (eventType.locationType === "PHONE") {
      meetingUrl = eventType.locationValue ? `tel:${eventType.locationValue.replace(/\D/g, "")}` : null
    }

    // Update booking with initial meeting URL if available
    if (meetingUrl) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { meetingUrl },
      })
      booking.meetingUrl = meetingUrl
    }

    // Create Google Calendar events for all bookings in series
    if (eventType.user.calendarSyncEnabled) {
      try {
        const accessToken = await getGoogleAccessToken(eventType.userId)
        if (accessToken) {
          for (const b of allBookings) {
            try {
              const bookingData: BookingData = {
                id: b.id,
                guestName: b.guestName,
                guestEmail: b.guestEmail,
                startTime: b.startTime,
                endTime: b.endTime,
                eventType: {
                  title: b.eventType.title,
                  description: b.eventType.description,
                  location: b.eventType.location,
                  locationType: eventType.locationType,
                  locationValue: eventType.locationValue,
                },
                host: {
                  name: b.host.name,
                  email: b.host.email,
                },
              }
              const result = await createCalendarEvent(accessToken, bookingData)
              
              const calUpdateData: { googleEventId?: string; meetingUrl?: string } = {}
              if (result.googleEventId) calUpdateData.googleEventId = result.googleEventId
              if (result.meetingUrl) calUpdateData.meetingUrl = result.meetingUrl
              
              if (Object.keys(calUpdateData).length > 0) {
                await prisma.booking.update({ where: { id: b.id }, data: calUpdateData })
                if (b.id === booking.id) {
                  booking.meetingUrl = result.meetingUrl || booking.meetingUrl
                }
                bookingLogger.debug("Calendar event created", { bookingId: b.id, googleEventId: result.googleEventId })
              }
            } catch (err) {
              bookingLogger.error("Calendar event creation failed for booking in series", err, { bookingId: b.id })
            }
          }
        } else {
          bookingLogger.warn("No Google access token available", { bookingId: booking.id, hostId: eventType.userId })
        }
      } catch (err) {
        bookingLogger.error("Calendar event creation failed", err, { bookingId: booking.id })
      }
    }

    // Send confirmation email to guest and notification to host
    sendBookingEmails({
      booking: {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        startTime: booking.startTime,
        endTime: booking.endTime,
        meetingUrl: booking.meetingUrl,
      },
      eventType: {
        title: booking.eventType.title,
        location: booking.eventType.location,
      },
      host: {
        name: booking.host.name,
        email: booking.host.email,
        timezone: booking.host.timezone,
      },
    }).catch((err) => {
      bookingLogger.error("Failed to send booking emails", err, { bookingId: booking.id })
    })

    // Trigger workflow automations
    executeWorkflow("BOOKING_CREATED", booking.id).catch((err) => {
      bookingLogger.error("Workflow execution failed", err, { bookingId: booking.id })
    })

    // Trigger webhook for booking.created event
    triggerWebhook(eventType.userId, "booking.created", {
      booking: {
        id: booking.id,
        eventType: {
          id: booking.eventType.id,
          title: booking.eventType.title,
          duration: booking.eventType.duration,
        },
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        status: booking.status,
        createdAt: booking.createdAt.toISOString(),
      },
      host: {
        id: eventType.user.id,
        name: eventType.user.name,
        email: eventType.user.email,
      },
    }).catch((err) => {
      bookingLogger.error("Webhook trigger failed", err, { bookingId: booking.id })
    })

    // L1: Strip host email from response
    const { host: { email: _hostEmail, ...hostRest }, ...bookingRest } = booking
    return NextResponse.json({ ...bookingRest, host: hostRest }, { status: 201 })
  } catch (error) {
    bookingLogger.error("Error creating booking", error, { requestId })
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
