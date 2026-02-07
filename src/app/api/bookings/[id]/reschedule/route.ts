import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { getFreeBusyTimes } from "@/lib/calendar"

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/bookings/[id]/reschedule - Get available slots for rescheduling
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const dateStr = searchParams.get("date")

    if (!dateStr) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: true,
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            timezone: true,
            username: true,
          },
          include: {
            availability: true,
            dateOverrides: true,
          },
        },
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
    const isGuest = email && email.toLowerCase() === booking.guestEmail.toLowerCase()

    if (!isHost && !isGuest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = booking.host
    const eventType = booking.eventType
    const requestedDate = dateFns.parse(dateStr, "yyyy-MM-dd", new Date())
    const now = new Date()
    const minBookingDate = dateFns.addMinutes(now, eventType.minNotice)
    const maxBookingDate = dateFns.addDays(now, eventType.maxDaysAhead)

    if (dateFns.isAfter(dateFns.startOfDay(requestedDate), dateFns.endOfDay(maxBookingDate))) {
      return NextResponse.json({ slots: [] })
    }

    const dayOfWeek = requestedDate.getDay()
    const dateOverride = user.dateOverrides.find(
      (d) => dateFns.format(d.date, "yyyy-MM-dd") === dateStr
    )

    let availableWindows: { start: string; end: string }[] = []
    if (dateOverride) {
      if (dateOverride.isAvailable && dateOverride.startTime && dateOverride.endTime) {
        availableWindows = [{ start: dateOverride.startTime, end: dateOverride.endTime }]
      }
    } else {
      availableWindows = user.availability
        .filter((a) => a.dayOfWeek === dayOfWeek)
        .map((a) => ({ start: a.startTime, end: a.endTime }))
    }

    if (availableWindows.length === 0) {
      return NextResponse.json({ slots: [] })
    }

    // Get existing bookings (excluding the current one being rescheduled)
    const existingBookings = await prisma.booking.findMany({
      where: {
        hostId: user.id,
        id: { not: booking.id }, // Exclude current booking
        status: { not: "CANCELLED" },
        startTime: {
          gte: dateFns.startOfDay(requestedDate),
          lte: dateFns.endOfDay(requestedDate),
        },
      },
      select: { startTime: true, endTime: true },
    })

    // Fetch busy times from Google Calendar
    const googleBusyTimes = await getFreeBusyTimes(
      user.id,
      dateFns.startOfDay(requestedDate),
      dateFns.endOfDay(requestedDate)
    )

    const slots: string[] = []
    const { duration, bufferBefore, bufferAfter } = eventType

    for (const window of availableWindows) {
      const [startHour, startMinute] = window.start.split(":").map(Number)
      const [endHour, endMinute] = window.end.split(":").map(Number)
      let slotStart = dateFns.setMinutes(dateFns.setHours(requestedDate, startHour), startMinute)
      const windowEnd = dateFns.setMinutes(dateFns.setHours(requestedDate, endHour), endMinute)

      while (dateFns.addMinutes(slotStart, duration) <= windowEnd) {
        const slotEnd = dateFns.addMinutes(slotStart, duration)
        const slotWithBufferStart = dateFns.addMinutes(slotStart, -bufferBefore)
        const slotWithBufferEnd = dateFns.addMinutes(slotEnd, bufferAfter)

        if (dateFns.isAfter(slotStart, minBookingDate)) {
          const hasBookingConflict = existingBookings.some(
            (b) => slotWithBufferStart < new Date(b.endTime) && slotWithBufferEnd > new Date(b.startTime)
          )
          const hasGoogleConflict = googleBusyTimes.some(
            (b) => slotWithBufferStart < b.end && slotWithBufferEnd > b.start
          )
          if (!hasBookingConflict && !hasGoogleConflict) {
            slots.push(dateFns.format(slotStart, "HH:mm"))
          }
        }
        slotStart = dateFns.addMinutes(slotStart, duration <= 30 ? 15 : 30)
      }
    }

    return NextResponse.json({
      slots,
      booking: {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        currentStartTime: booking.startTime,
        currentEndTime: booking.endTime,
      },
      eventType: {
        id: eventType.id,
        title: eventType.title,
        duration: eventType.duration,
        description: eventType.description,
        location: eventType.location,
        maxDaysAhead: eventType.maxDaysAhead,
      },
      host: {
        name: user.name,
        username: user.username,
        timezone: user.timezone,
      },
    })
  } catch (error) {
    console.error("Error fetching reschedule slots:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
