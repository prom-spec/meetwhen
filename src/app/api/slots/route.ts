import { NextRequest, NextResponse } from "next/server"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { getFreeBusyTimes } from "@/lib/calendar"
import { getRoundRobinSlots, getCollectiveSlots } from "@/lib/team-scheduling"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")
    const teamSlug = searchParams.get("teamSlug")
    const eventSlug = searchParams.get("eventSlug")
    const dateStr = searchParams.get("date")

    if (!eventSlug || !dateStr) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Handle team event slots
    if (teamSlug) {
      return handleTeamSlots(teamSlug, eventSlug, dateStr)
    }

    // Handle individual user slots
    if (!username) {
      return NextResponse.json({ error: "Missing username or teamSlug" }, { status: 400 })
    }

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
    if (dateOverride) {
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
      hostTimezone: user.timezone,
    })
  } catch (error) {
    console.error("Error fetching slots:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Handle team event slots (round-robin or collective)
async function handleTeamSlots(teamSlug: string, eventSlug: string, dateStr: string) {
  try {
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      include: {
        eventTypes: {
          where: { slug: eventSlug, isActive: true },
          include: {
            user: {
              select: { timezone: true },
            },
          },
        },
        members: {
          include: {
            user: {
              select: { timezone: true },
            },
          },
        },
      },
    })

    if (!team || team.eventTypes.length === 0) {
      return NextResponse.json({ error: "Team event type not found" }, { status: 404 })
    }

    const eventType = team.eventTypes[0]
    const requestedDate = dateFns.parse(dateStr, "yyyy-MM-dd", new Date())

    // Use the team owner's or first member's timezone as default
    const teamTimezone = team.members[0]?.user.timezone || "UTC"

    let slots: string[] = []

    if (eventType.schedulingType === "ROUND_ROBIN") {
      const roundRobinSlots = await getRoundRobinSlots(team.id, requestedDate, {
        duration: eventType.duration,
        bufferBefore: eventType.bufferBefore,
        bufferAfter: eventType.bufferAfter,
        minNotice: eventType.minNotice,
        maxDaysAhead: eventType.maxDaysAhead,
      })
      slots = roundRobinSlots.map((s) => s.time)
    } else if (eventType.schedulingType === "COLLECTIVE") {
      slots = await getCollectiveSlots(team.id, requestedDate, {
        duration: eventType.duration,
        bufferBefore: eventType.bufferBefore,
        bufferAfter: eventType.bufferAfter,
        minNotice: eventType.minNotice,
        maxDaysAhead: eventType.maxDaysAhead,
      })
    }

    return NextResponse.json({
      slots,
      eventType: {
        id: eventType.id,
        title: eventType.title,
        duration: eventType.duration,
        description: eventType.description,
        location: eventType.location,
        schedulingType: eventType.schedulingType,
      },
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
      },
      hostTimezone: teamTimezone,
    })
  } catch (error) {
    console.error("Error fetching team slots:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
