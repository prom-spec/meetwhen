import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { getGoogleAccessToken, deleteCalendarEvent, createCalendarEvent, hasCalendarConflict, BookingData } from "@/lib/calendar"
import { sendBookingCancellation, sendBookingReschedule } from "@/lib/email"
import { triggerWebhook } from "@/lib/webhooks"
import { executeWorkflow } from "@/lib/workflows"
import { verifyBookingToken } from "@/lib/booking-tokens"
import { logAudit } from "@/lib/audit"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/bookings/[id] - Get booking details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: true,
        host: { select: { id: true, name: true, email: true, timezone: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Check authorization: must be host (authenticated) or guest (via token param)
    const session = await getServerSession(authOptions)
    const isHost = session?.user?.id === booking.hostId
    const isGuest = token ? verifyBookingToken(token, id, booking.guestEmail) : false

    if (!isHost && !isGuest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Strip host email from guest-facing response
    if (!isHost) {
      const { host: { email: _hostEmail, ...hostRest }, ...bookingRest } = booking
      return NextResponse.json({ ...bookingRest, host: hostRest })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("Error fetching booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/bookings/[id] - Cancel a booking (or entire series with ?cancelSeries=true)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    const cancelSeries = searchParams.get("cancelSeries") === "true"

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: true,
        host: { select: { id: true, name: true, email: true, timezone: true } },
        recurrenceChildren: { select: { id: true, googleEventId: true, status: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 })
    }

    // Check authorization: must be host (authenticated) or guest (via token param)
    const session = await getServerSession(authOptions)
    const isHost = session?.user?.id === booking.hostId
    const isGuest = token ? verifyBookingToken(token, id, booking.guestEmail) : false

    if (!isHost && !isGuest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cancelledBy = isHost ? "host" : "guest"

    // Determine which bookings to cancel
    let bookingsToCancelIds = [id]
    let extraGoogleEventIds: string[] = []

    if (cancelSeries) {
      // If this is a parent, cancel all children
      if (booking.recurrenceChildren && booking.recurrenceChildren.length > 0) {
        const activeChildren = booking.recurrenceChildren.filter(c => c.status !== "CANCELLED")
        bookingsToCancelIds.push(...activeChildren.map(c => c.id))
        extraGoogleEventIds = activeChildren.filter(c => c.googleEventId).map(c => c.googleEventId!)
      }
      // If this is a child, also cancel parent + siblings
      if (booking.recurrenceParentId) {
        const parent = await prisma.booking.findUnique({
          where: { id: booking.recurrenceParentId },
          include: { recurrenceChildren: { select: { id: true, googleEventId: true, status: true } } },
        })
        if (parent && parent.status !== "CANCELLED") {
          bookingsToCancelIds.push(parent.id)
          if (parent.googleEventId) extraGoogleEventIds.push(parent.googleEventId)
        }
        if (parent?.recurrenceChildren) {
          const siblings = parent.recurrenceChildren.filter(c => c.id !== id && c.status !== "CANCELLED")
          bookingsToCancelIds.push(...siblings.map(c => c.id))
          extraGoogleEventIds.push(...siblings.filter(c => c.googleEventId).map(c => c.googleEventId!))
        }
      }
    }

    // Update all booking statuses
    await prisma.booking.updateMany({
      where: { id: { in: bookingsToCancelIds } },
      data: { status: "CANCELLED" },
    })

    // Delete Google Calendar events
    const accessToken = await getGoogleAccessToken(booking.hostId, booking.eventType.calendarAccountId)
    if (accessToken) {
      const allGoogleEventIds = [booking.googleEventId, ...extraGoogleEventIds].filter(Boolean) as string[]
      for (const gEventId of allGoogleEventIds) {
        try {
          await deleteCalendarEvent(accessToken, gEventId)
        } catch (err) {
          console.error("Failed to delete calendar event:", gEventId, err)
        }
      }
    }

    // Send cancellation emails to both parties
    await sendBookingCancellation({
      booking: {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        startTime: booking.startTime,
        endTime: booking.endTime,
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
      cancelledBy,
    })

    // Trigger workflow automations
    executeWorkflow("BOOKING_CANCELLED", booking.id).catch((err) =>
      console.error("Workflow execution failed:", err)
    )

    // Trigger webhook for booking.cancelled event
    triggerWebhook(booking.hostId, "booking.cancelled", {
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
        status: "CANCELLED",
      },
      host: {
        id: booking.host.id,
        name: booking.host.name,
        email: booking.host.email,
      },
      cancelledBy,
      cancelledSeries: cancelSeries,
      cancelledCount: bookingsToCancelIds.length,
    }).catch((err) => console.error("Webhook trigger failed:", err))

    logAudit(booking.hostId, "booking.cancelled", "booking", id, { cancelledBy, cancelSeries, cancelledCount: bookingsToCancelIds.length })

    return NextResponse.json({ 
      success: true, 
      message: cancelSeries ? `Series cancelled (${bookingsToCancelIds.length} bookings)` : "Booking cancelled successfully",
      cancelledCount: bookingsToCancelIds.length,
    })
  } catch (error) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/bookings/[id] - Reschedule a booking
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { startTime: newStartTimeISO, token } = body

    if (!newStartTimeISO) {
      return NextResponse.json({ error: "New start time is required" }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: {
          include: {
            user: { select: { id: true, name: true, email: true, timezone: true, calendarSyncEnabled: true } },
          },
        },
        host: { select: { id: true, name: true, email: true, timezone: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot reschedule a cancelled booking" }, { status: 400 })
    }

    // Check authorization
    const session = await getServerSession(authOptions)
    const isHost = session?.user?.id === booking.hostId
    const isGuest = token ? verifyBookingToken(token, id, booking.guestEmail) : false

    if (!isHost && !isGuest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rescheduledBy = isHost ? "host" : "guest"
    const oldStartTime = booking.startTime
    const oldEndTime = booking.endTime

    const newStartTime = new Date(newStartTimeISO)
    const newEndTime = dateFns.addMinutes(newStartTime, booking.eventType.duration)

    // Validate new time
    const now = new Date()
    const minBookingTime = dateFns.addMinutes(now, booking.eventType.minNotice)
    if (dateFns.isBefore(newStartTime, minBookingTime)) {
      return NextResponse.json({ error: "New time slot is too soon" }, { status: 400 })
    }

    // Check for conflicts (excluding current booking)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        hostId: booking.hostId,
        id: { not: booking.id },
        status: { not: "CANCELLED" },
        OR: [{ startTime: { lt: newEndTime }, endTime: { gt: newStartTime } }],
      },
    })

    if (conflictingBooking) {
      return NextResponse.json({ error: "Time slot is no longer available" }, { status: 409 })
    }

    // Check Google Calendar for conflicts
    const hasGCalConflict = await hasCalendarConflict(booking.hostId, newStartTime, newEndTime)
    if (hasGCalConflict) {
      return NextResponse.json({ error: "Time slot conflicts with existing calendar event" }, { status: 409 })
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
      },
      include: {
        eventType: true,
        host: { select: { name: true, email: true, timezone: true } },
      },
    })

    // Update Google Calendar event if exists
    if (booking.googleEventId && booking.eventType.user.calendarSyncEnabled) {
      const accessToken = await getGoogleAccessToken(booking.hostId)
      if (accessToken) {
        // Delete old event and create new one
        await deleteCalendarEvent(accessToken, booking.googleEventId)
        
        const bookingData: BookingData = {
          id: updatedBooking.id,
          guestName: updatedBooking.guestName,
          guestEmail: updatedBooking.guestEmail,
          startTime: updatedBooking.startTime,
          endTime: updatedBooking.endTime,
          eventType: {
            title: updatedBooking.eventType.title,
            description: updatedBooking.eventType.description,
            location: updatedBooking.eventType.location,
            locationType: updatedBooking.eventType.locationType,
            locationValue: updatedBooking.eventType.locationValue,
          },
          host: {
            name: updatedBooking.host.name,
            email: updatedBooking.host.email,
          },
        }
        
        const calendarResult = await createCalendarEvent(accessToken, bookingData)
        if (calendarResult.googleEventId) {
          await prisma.booking.update({
            where: { id },
            data: { 
              googleEventId: calendarResult.googleEventId,
              meetingUrl: calendarResult.meetingUrl,
            },
          })
        }
      }
    }

    // Send reschedule notification emails
    await sendBookingReschedule({
      booking: {
        id: updatedBooking.id,
        guestName: updatedBooking.guestName,
        guestEmail: updatedBooking.guestEmail,
        guestTimezone: updatedBooking.guestTimezone,
        startTime: newStartTime,
        endTime: newEndTime,
      },
      eventType: {
        title: updatedBooking.eventType.title,
        location: updatedBooking.eventType.location,
      },
      host: {
        name: updatedBooking.host.name,
        email: updatedBooking.host.email,
        timezone: updatedBooking.host.timezone,
      },
      oldStartTime,
      oldEndTime,
      rescheduledBy,
    })

    // Trigger workflow automations
    executeWorkflow("BOOKING_RESCHEDULED", updatedBooking.id).catch((err) =>
      console.error("Workflow execution failed:", err)
    )

    // Trigger webhook for booking.rescheduled event
    triggerWebhook(booking.hostId, "booking.rescheduled", {
      booking: {
        id: updatedBooking.id,
        eventType: {
          id: updatedBooking.eventType.id,
          title: updatedBooking.eventType.title,
          duration: updatedBooking.eventType.duration,
        },
        guestName: updatedBooking.guestName,
        guestEmail: updatedBooking.guestEmail,
        guestTimezone: updatedBooking.guestTimezone,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        status: updatedBooking.status,
      },
      host: {
        id: booking.host.id,
        name: updatedBooking.host.name,
        email: updatedBooking.host.email,
      },
      previousSchedule: {
        startTime: oldStartTime.toISOString(),
        endTime: oldEndTime.toISOString(),
      },
      rescheduledBy,
    }).catch((err) => console.error("Webhook trigger failed:", err))

    logAudit(booking.hostId, "booking.rescheduled", "booking", id, { rescheduledBy, oldStartTime: oldStartTime.toISOString(), newStartTime: newStartTime.toISOString() })

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error("Error rescheduling booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
