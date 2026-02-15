import { NextRequest, NextResponse } from "next/server"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { getFreeBusyTimes } from "@/lib/calendar"
import { apiLogger } from "@/lib/logger"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date")

    if (!dateStr) {
      return NextResponse.json({ error: "Missing date parameter" }, { status: 400 })
    }

    const eventType = await prisma.eventType.findUnique({
      where: { id, isActive: true },
      include: {
        user: {
          include: {
            availability: true,
            dateOverrides: true,
          },
        },
      },
    })

    if (!eventType || !eventType.user) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    const user = eventType.user
    const requestedDate = dateFns.parse(dateStr, "yyyy-MM-dd", new Date())
    const now = new Date()
    const minBookingDate = dateFns.addMinutes(now, eventType.minNotice)
    const maxBookingDate = dateFns.addDays(now, eventType.maxDaysAhead)

    if (dateFns.isAfter(dateFns.startOfDay(requestedDate), dateFns.endOfDay(maxBookingDate))) {
    return NextResponse.json({ slots: [] })
  }

    const dayOfWeek = requestedDate.getDay()
    const dateOverride = user.dateOverrides.find((d) => dateFns.format(d.date, "yyyy-MM-dd") === dateStr)

    let availableWindows: { start: string; end: string }[] = []
    
    // If the event type has its own time range, use that instead of general availability
    // This allows e.g. a "dinner" event to show 6pm-10pm even if general hours are 9am-5pm
    if (eventType.availableStartTime && eventType.availableEndTime) {
      // Event-type-specific time range — show on any day the user has *any* availability (or date override)
      const hasAvailability = dateOverride
        ? dateOverride.isAvailable
        : user.availability.some((a) => a.dayOfWeek === dayOfWeek)
      if (hasAvailability) {
        availableWindows = [{ start: eventType.availableStartTime, end: eventType.availableEndTime }]
      }
    } else if (dateOverride) {
      if (dateOverride.isAvailable && dateOverride.startTime && dateOverride.endTime) {
        availableWindows = [{ start: dateOverride.startTime, end: dateOverride.endTime }]
      }
    } else {
      availableWindows = user.availability.filter((a) => a.dayOfWeek === dayOfWeek).map((a) => ({ start: a.startTime, end: a.endTime }))
    }

    if (availableWindows.length === 0) {
    return NextResponse.json({ slots: [] })
  }

    const existingBookings = await prisma.booking.findMany({
    where: { hostId: user.id, status: { not: "CANCELLED" }, startTime: { gte: dateFns.startOfDay(requestedDate), lte: dateFns.endOfDay(requestedDate) } },
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
        const hasBookingConflict = existingBookings.some((b) => slotWithBufferStart < new Date(b.endTime) && slotWithBufferEnd > new Date(b.startTime))
        const hasGoogleConflict = googleBusyTimes.some((b) => slotWithBufferStart < b.end && slotWithBufferEnd > b.start)
        if (!hasBookingConflict && !hasGoogleConflict) slots.push(dateFns.format(slotStart, "HH:mm"))
      }
      slotStart = dateFns.addMinutes(slotStart, duration <= 30 ? 15 : 30)
    }
  }

    return NextResponse.json({
      slots,
      eventType: { id: eventType.id, title: eventType.title, duration: eventType.duration, description: eventType.description, location: eventType.location },
      host: { name: user.name, username: user.username },
      hostTimezone: user.timezone,
    })
  } catch (error) {
    apiLogger.error("Error fetching slots", error)
    return NextResponse.json({ error: "Unable to load available times. Please try again." }, { status: 500 })
  }
}
