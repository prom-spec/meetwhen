import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { getGoogleAccessToken, deleteCalendarEvent, createCalendarEvent, hasCalendarConflict, BookingData } from "@/lib/calendar"
import { sendBookingCancellation, sendBookingReschedule } from "@/lib/email"
import { triggerWebhook } from "@/lib/webhooks"
import { verifyBookingToken } from "@/lib/booking-tokens"

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

// DELETE /api/bookings/[id] - Cancel a booking
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Update booking status
    await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    // Delete Google Calendar event if exists
    if (booking.googleEventId) {
      const accessToken = await getGoogleAccessToken(booking.hostId)
      if (accessToken) {
        await deleteCalendarEvent(accessToken, booking.googleEventId)
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
    }).catch((err) => console.error("Webhook trigger failed:", err))

    return NextResponse.json({ success: true, message: "Booking cancelled successfully" })
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

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error("Error rescheduling booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
