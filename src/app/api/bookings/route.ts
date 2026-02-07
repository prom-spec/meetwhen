import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { createCalendarEvent, hasCalendarConflict, getGoogleAccessToken, BookingData } from "@/lib/calendar"
import { triggerWebhook } from "@/lib/webhooks"
import { getNextRoundRobinMember, updateLastAssignedMember, createCollectiveBooking, isMemberAvailableAtSlot } from "@/lib/team-scheduling"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const bookings = await prisma.booking.findMany({
      where: { hostId: session.user.id },
      include: {
        eventType: {
          select: { title: true, duration: true, color: true },
        },
      },
      orderBy: { startTime: "desc" },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventTypeId, guestName, guestEmail, guestTimezone, date, time, startTime: startTimeISO } = body

    if (!eventTypeId || !guestName || !guestEmail || (!startTimeISO && (!date || !time))) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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
      return NextResponse.json({ error: "Event type not found or inactive" }, { status: 404 })
    }

    // Parse start time (supports both ISO string or date+time)
    let startTime: Date
    if (startTimeISO) {
      startTime = new Date(startTimeISO)
    } else {
      const [hour, minute] = time.split(":").map(Number)
      startTime = dateFns.setMinutes(
        dateFns.setHours(dateFns.parse(date, "yyyy-MM-dd", new Date()), hour),
        minute
      )
    }
    const endTime = dateFns.addMinutes(startTime, eventType.duration)

    // Validate booking time
    const now = new Date()
    const minBookingTime = dateFns.addMinutes(now, eventType.minNotice)
    if (dateFns.isBefore(startTime, minBookingTime)) {
      return NextResponse.json({ error: "Time slot is too soon" }, { status: 400 })
    }

    // Handle team bookings
    if (eventType.teamId && eventType.team) {
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
              }
            }).catch((err) => console.error("Calendar event creation failed:", err))
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
          return NextResponse.json({ error: "No team members available at this time" }, { status: 409 })
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
              }
            }
          }).catch((err) => console.error("Calendar event creation failed:", err))
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
        }).catch((err) => console.error("Webhook trigger failed:", err))

        return NextResponse.json({
          ...booking,
          schedulingType: "ROUND_ROBIN",
          teamName: eventType.team.name,
        }, { status: 201 })
      }
    }

    // Standard individual booking
    // Check for conflicts
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        hostId: eventType.userId,
        status: { not: "CANCELLED" },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    })

    if (conflictingBooking) {
      return NextResponse.json({ error: "Time slot is no longer available" }, { status: 409 })
    }

    // Check Google Calendar for conflicts
    const hasGCalConflict = await hasCalendarConflict(eventType.userId, startTime, endTime)
    if (hasGCalConflict) {
      return NextResponse.json({ error: "Time slot conflicts with existing calendar event" }, { status: 409 })
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
      },
      include: {
        eventType: true,
        host: { select: { name: true, email: true, timezone: true } },
      },
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

    // Create Google Calendar event if enabled
    // For Google Meet, this will generate the Meet link
    if (eventType.user.calendarSyncEnabled) {
      getGoogleAccessToken(eventType.userId).then(async (accessToken) => {
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
          
          // Update booking with Google Calendar event ID and meeting URL
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
          }
        }
      }).catch((err) => console.error("Calendar event creation failed:", err))
    }

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
    }).catch((err) => console.error("Webhook trigger failed:", err))

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
