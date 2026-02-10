import { NextRequest, NextResponse } from "next/server"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"
import { getFreeBusyTimes } from "@/lib/calendar"
import { getRoundRobinSlots, getCollectiveSlots } from "@/lib/team-scheduling"
import { apiLogger } from "@/lib/logger"
import { isPublicHoliday } from "@/lib/holidays"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")
    const teamSlug = searchParams.get("teamSlug")
    const teamOwner = searchParams.get("teamOwner")
    const eventSlug = searchParams.get("eventSlug")
    const dateStr = searchParams.get("date")

    apiLogger.debug("Slots request", { username, teamSlug, teamOwner, eventSlug, date: dateStr })

    if (!eventSlug || !dateStr) {
      apiLogger.warn("Missing required parameters for slots", { eventSlug, dateStr })
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Handle team event slots
    if (teamSlug) {
      return handleTeamSlots(teamSlug, eventSlug, dateStr, teamOwner)
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
      apiLogger.warn("Event type not found", { username, eventSlug })
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

    // Block national holidays if enabled (unless user has explicit date override)
    if (user.blockHolidays && !dateOverride && isPublicHoliday(requestedDate, user.timezone)) {
      apiLogger.debug("Date is a public holiday, returning no slots", { date: dateStr, timezone: user.timezone })
      return NextResponse.json({ slots: [], holiday: true })
    }

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
      hostName: user.name || username,
      hostTimezone: user.timezone,
    })
  } catch (error) {
    apiLogger.error("Error fetching slots", error)
    return NextResponse.json({ error: "Unable to load available times. Please try again." }, { status: 500 })
  }
}

// Handle team event slots (round-robin or collective)
async function handleTeamSlots(teamSlug: string, eventSlug: string, dateStr: string, teamOwner?: string | null) {
  try {
    // Resolve team ID from owner username + slug, or fall back to slug-only
    let teamId: string | null = null
    if (teamOwner) {
      const owner = await prisma.user.findUnique({ where: { username: teamOwner }, select: { id: true } })
      if (!owner) {
        return NextResponse.json({ error: "Team owner not found" }, { status: 404 })
      }
      const found = await prisma.team.findUnique({
        where: { ownerId_slug: { ownerId: owner.id, slug: teamSlug } },
        select: { id: true },
      })
      teamId = found?.id ?? null
    } else {
      const found = await prisma.team.findFirst({ where: { slug: teamSlug }, select: { id: true } })
      teamId = found?.id ?? null
    }

    if (!teamId) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
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
      apiLogger.warn("Team event type not found", { teamSlug, eventSlug })
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
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
    apiLogger.error("Error fetching team slots", error, { teamSlug })
    return NextResponse.json({ error: "Unable to load available times. Please try again." }, { status: 500 })
  }
}
