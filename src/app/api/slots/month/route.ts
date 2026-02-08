import { NextRequest, NextResponse } from "next/server"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { getFreeBusyTimes } from "@/lib/calendar"
import { apiLogger } from "@/lib/logger"

// Returns which dates in a given month have at least one available slot
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")
    const eventSlug = searchParams.get("eventSlug")
    const monthStr = searchParams.get("month") // format: "2026-02"

    if (!username || !eventSlug || !monthStr) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const [yearStr, monStr] = monthStr.split("-")
    const year = parseInt(yearStr, 10)
    const month = parseInt(monStr, 10) - 1 // 0-indexed

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        eventTypes: { where: { slug: eventSlug, isActive: true, teamId: null } },
        availability: true,
        dateOverrides: true,
      },
    })

    if (!user || user.eventTypes.length === 0) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    const eventType = user.eventTypes[0]
    const now = new Date()
    const minBookingDate = dateFns.addMinutes(now, eventType.minNotice)
    const maxBookingDate = dateFns.addDays(now, eventType.maxDaysAhead)

    const monthStart = new Date(year, month, 1)
    const monthEnd = dateFns.endOfMonth(monthStart)

    // Clamp to valid booking range
    const rangeStart = dateFns.max([monthStart, dateFns.startOfDay(now)])
    const rangeEnd = dateFns.min([monthEnd, maxBookingDate])

    if (rangeStart > rangeEnd) {
      return NextResponse.json({ availableDates: [] })
    }

    // Fetch all bookings for the range
    const existingBookings = await prisma.booking.findMany({
      where: {
        hostId: user.id,
        status: { not: "CANCELLED" },
        startTime: { gte: dateFns.startOfDay(rangeStart), lte: dateFns.endOfDay(rangeEnd) },
      },
      select: { startTime: true, endTime: true },
    })

    // Fetch Google Calendar busy times for the entire range
    const googleBusyTimes = await getFreeBusyTimes(
      user.id,
      dateFns.startOfDay(rangeStart),
      dateFns.endOfDay(rangeEnd)
    )

    const availableDates: string[] = []
    const { duration, bufferBefore, bufferAfter } = eventType

    let currentDate = rangeStart
    while (currentDate <= rangeEnd) {
      const dateStr = dateFns.format(currentDate, "yyyy-MM-dd")
      const dayOfWeek = currentDate.getDay()

      const dateOverride = user.dateOverrides.find(
        (d) => dateFns.format(d.date, "yyyy-MM-dd") === dateStr
      )

      let windows: { start: string; end: string }[] = []
      if (dateOverride) {
        if (dateOverride.isAvailable && dateOverride.startTime && dateOverride.endTime) {
          windows = [{ start: dateOverride.startTime, end: dateOverride.endTime }]
        }
      } else {
        windows = user.availability
          .filter((a) => a.dayOfWeek === dayOfWeek)
          .map((a) => ({ start: a.startTime, end: a.endTime }))
      }

      // Check if at least one slot exists on this day
      let hasSlot = false
      for (const window of windows) {
        if (hasSlot) break
        const [startHour, startMinute] = window.start.split(":").map(Number)
        const [endHour, endMinute] = window.end.split(":").map(Number)
        let slotStart = dateFns.setMinutes(dateFns.setHours(currentDate, startHour), startMinute)
        const windowEnd = dateFns.setMinutes(dateFns.setHours(currentDate, endHour), endMinute)

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
              hasSlot = true
              break
            }
          }
          slotStart = dateFns.addMinutes(slotStart, duration <= 30 ? 15 : 30)
        }
      }

      if (hasSlot) {
        availableDates.push(dateStr)
      }

      currentDate = dateFns.addDays(currentDate, 1)
    }

    return NextResponse.json({ availableDates })
  } catch (error) {
    apiLogger.error("Error fetching month availability", error)
    return NextResponse.json({ error: "Unable to load availability" }, { status: 500 })
  }
}
