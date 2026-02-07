import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { createCalendarEvent, hasCalendarConflict, getGoogleAccessToken } from "@/lib/calendar"

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
      include: { user: true },
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

    // Create Google Calendar event (async, don't block response)
    getGoogleAccessToken(eventType.userId).then(async (accessToken) => {
      if (accessToken) {
        const googleEventId = await createCalendarEvent(accessToken, {
          id: booking.id,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          startTime: booking.startTime,
          endTime: booking.endTime,
          eventType: {
            title: booking.eventType.title,
            description: booking.eventType.description,
            location: booking.eventType.location,
          },
          host: {
            name: booking.host.name,
            email: booking.host.email,
          },
        })
        
        if (googleEventId) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: { googleEventId },
          })
        }
      }
    }).catch((err) => console.error("Calendar event creation failed:", err))

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
