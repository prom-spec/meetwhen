// Team scheduling utilities for round-robin and collective scheduling

import prisma from "@/lib/prisma"
import { getFreeBusyTimes } from "@/lib/calendar"
import * as dateFns from "date-fns"

export interface TeamMemberAvailability {
  userId: string
  userName: string | null
  isAvailable: boolean
  availability: { dayOfWeek: number; startTime: string; endTime: string }[]
  dateOverrides: { date: Date; isAvailable: boolean; startTime: string | null; endTime: string | null }[]
}

export interface AvailableSlot {
  time: string // HH:mm format
  availableMembers: string[] // User IDs of available members
}

/**
 * Get all team members with their availability data
 */
export async function getTeamMembersWithAvailability(teamId: string): Promise<TeamMemberAvailability[]> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: {
        include: {
          availability: true,
          dateOverrides: true,
        },
      },
    },
    orderBy: { priority: "asc" },
  })

  return members.map((member) => ({
    userId: member.userId,
    userName: member.user.name,
    isAvailable: true,
    availability: member.user.availability.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
    })),
    dateOverrides: member.user.dateOverrides.map((d) => ({
      date: d.date,
      isAvailable: d.isAvailable,
      startTime: d.startTime,
      endTime: d.endTime,
    })),
  }))
}

/**
 * Check if a team member is available at a specific slot
 */
export async function isMemberAvailableAtSlot(
  userId: string,
  slotStart: Date,
  slotEnd: Date,
  bufferBefore: number = 0,
  bufferAfter: number = 0
): Promise<boolean> {
  const bufferedStart = dateFns.addMinutes(slotStart, -bufferBefore)
  const bufferedEnd = dateFns.addMinutes(slotEnd, bufferAfter)

  // Check existing bookings
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      hostId: userId,
      status: { not: "CANCELLED" },
      startTime: { lt: bufferedEnd },
      endTime: { gt: bufferedStart },
    },
  })

  if (conflictingBooking) {
    return false
  }

  // Check Google Calendar
  const googleBusyTimes = await getFreeBusyTimes(
    userId,
    dateFns.startOfDay(slotStart),
    dateFns.endOfDay(slotStart)
  )

  const hasGoogleConflict = googleBusyTimes.some(
    (b) => bufferedStart < b.end && bufferedEnd > b.start
  )

  return !hasGoogleConflict
}

/**
 * Get the next team member for round-robin assignment
 * Considers member priority and last assigned member
 */
export async function getNextRoundRobinMember(
  teamId: string,
  slotStart: Date,
  slotEnd: Date,
  bufferBefore: number = 0,
  bufferAfter: number = 0
): Promise<string | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: { user: true },
        orderBy: { priority: "asc" },
      },
    },
  })

  if (!team || team.members.length === 0) {
    return null
  }

  const members = team.members
  const lastAssignedId = team.lastAssignedMemberId

  // Find the index of the last assigned member
  let startIndex = 0
  if (lastAssignedId) {
    const lastIndex = members.findIndex((m) => m.userId === lastAssignedId)
    if (lastIndex !== -1) {
      startIndex = (lastIndex + 1) % members.length
    }
  }

  // Try each member starting from the next one after last assigned
  for (let i = 0; i < members.length; i++) {
    const index = (startIndex + i) % members.length
    const member = members[index]

    const isAvailable = await isMemberAvailableAtSlot(
      member.userId,
      slotStart,
      slotEnd,
      bufferBefore,
      bufferAfter
    )

    if (isAvailable) {
      return member.userId
    }
  }

  return null
}

/**
 * Update the last assigned member for a team (for round-robin tracking)
 */
export async function updateLastAssignedMember(teamId: string, memberId: string): Promise<void> {
  await prisma.team.update({
    where: { id: teamId },
    data: { lastAssignedMemberId: memberId },
  })
}

/**
 * Get available slots for round-robin scheduling
 * Returns slots where at least one team member is available
 */
export async function getRoundRobinSlots(
  teamId: string,
  date: Date,
  eventType: {
    duration: number
    bufferBefore: number
    bufferAfter: number
    minNotice: number
    maxDaysAhead: number
  }
): Promise<AvailableSlot[]> {
  const membersWithAvailability = await getTeamMembersWithAvailability(teamId)
  
  if (membersWithAvailability.length === 0) {
    return []
  }

  const now = new Date()
  const minBookingDate = dateFns.addMinutes(now, eventType.minNotice)
  const maxBookingDate = dateFns.addDays(now, eventType.maxDaysAhead)

  if (dateFns.isAfter(dateFns.startOfDay(date), dateFns.endOfDay(maxBookingDate))) {
    return []
  }

  const dayOfWeek = date.getDay()
  const dateStr = dateFns.format(date, "yyyy-MM-dd")

  // Collect all possible time windows from all members
  const allTimeWindows: Map<string, string[]> = new Map() // time -> userIds

  for (const member of membersWithAvailability) {
    // Check for date override
    const dateOverride = member.dateOverrides.find(
      (d) => dateFns.format(d.date, "yyyy-MM-dd") === dateStr
    )

    let windows: { start: string; end: string }[] = []
    if (dateOverride) {
      if (dateOverride.isAvailable && dateOverride.startTime && dateOverride.endTime) {
        windows = [{ start: dateOverride.startTime, end: dateOverride.endTime }]
      }
    } else {
      windows = member.availability
        .filter((a) => a.dayOfWeek === dayOfWeek)
        .map((a) => ({ start: a.startTime, end: a.endTime }))
    }

    // Generate potential slots for this member
    for (const window of windows) {
      const [startHour, startMinute] = window.start.split(":").map(Number)
      const [endHour, endMinute] = window.end.split(":").map(Number)
      let slotStart = dateFns.setMinutes(dateFns.setHours(date, startHour), startMinute)
      const windowEnd = dateFns.setMinutes(dateFns.setHours(date, endHour), endMinute)

      const interval = eventType.duration <= 30 ? 15 : 30

      while (dateFns.addMinutes(slotStart, eventType.duration) <= windowEnd) {
        const slotEnd = dateFns.addMinutes(slotStart, eventType.duration)

        if (dateFns.isAfter(slotStart, minBookingDate)) {
          // Check if this specific member is available
          const isAvailable = await isMemberAvailableAtSlot(
            member.userId,
            slotStart,
            slotEnd,
            eventType.bufferBefore,
            eventType.bufferAfter
          )

          if (isAvailable) {
            const timeStr = dateFns.format(slotStart, "HH:mm")
            const existing = allTimeWindows.get(timeStr) || []
            if (!existing.includes(member.userId)) {
              existing.push(member.userId)
            }
            allTimeWindows.set(timeStr, existing)
          }
        }

        slotStart = dateFns.addMinutes(slotStart, interval)
      }
    }
  }

  // Convert to array of available slots
  const slots: AvailableSlot[] = []
  for (const [time, memberIds] of allTimeWindows) {
    if (memberIds.length > 0) {
      slots.push({ time, availableMembers: memberIds })
    }
  }

  // Sort by time
  slots.sort((a, b) => a.time.localeCompare(b.time))

  return slots
}

/**
 * Get available slots for collective scheduling
 * Returns only slots where ALL team members are available
 */
export async function getCollectiveSlots(
  teamId: string,
  date: Date,
  eventType: {
    duration: number
    bufferBefore: number
    bufferAfter: number
    minNotice: number
    maxDaysAhead: number
  }
): Promise<string[]> {
  const membersWithAvailability = await getTeamMembersWithAvailability(teamId)
  
  if (membersWithAvailability.length === 0) {
    return []
  }

  const now = new Date()
  const minBookingDate = dateFns.addMinutes(now, eventType.minNotice)
  const maxBookingDate = dateFns.addDays(now, eventType.maxDaysAhead)

  if (dateFns.isAfter(dateFns.startOfDay(date), dateFns.endOfDay(maxBookingDate))) {
    return []
  }

  const dayOfWeek = date.getDay()
  const dateStr = dateFns.format(date, "yyyy-MM-dd")

  // Find the intersection of all members' availability windows
  let commonWindows: { start: string; end: string }[] | null = null

  for (const member of membersWithAvailability) {
    const dateOverride = member.dateOverrides.find(
      (d) => dateFns.format(d.date, "yyyy-MM-dd") === dateStr
    )

    let memberWindows: { start: string; end: string }[] = []
    if (dateOverride) {
      if (dateOverride.isAvailable && dateOverride.startTime && dateOverride.endTime) {
        memberWindows = [{ start: dateOverride.startTime, end: dateOverride.endTime }]
      }
    } else {
      memberWindows = member.availability
        .filter((a) => a.dayOfWeek === dayOfWeek)
        .map((a) => ({ start: a.startTime, end: a.endTime }))
    }

    if (memberWindows.length === 0) {
      return [] // If any member has no availability, no collective slots possible
    }

    if (commonWindows === null) {
      commonWindows = memberWindows
    } else {
      // Intersect windows
      commonWindows = intersectWindows(commonWindows, memberWindows)
      if (commonWindows.length === 0) {
        return []
      }
    }
  }

  if (!commonWindows || commonWindows.length === 0) {
    return []
  }

  // Generate slots from common windows and verify all members are available
  const slots: string[] = []
  const interval = eventType.duration <= 30 ? 15 : 30

  for (const window of commonWindows) {
    const [startHour, startMinute] = window.start.split(":").map(Number)
    const [endHour, endMinute] = window.end.split(":").map(Number)
    let slotStart = dateFns.setMinutes(dateFns.setHours(date, startHour), startMinute)
    const windowEnd = dateFns.setMinutes(dateFns.setHours(date, endHour), endMinute)

    while (dateFns.addMinutes(slotStart, eventType.duration) <= windowEnd) {
      if (dateFns.isAfter(slotStart, minBookingDate)) {
        const slotEnd = dateFns.addMinutes(slotStart, eventType.duration)

        // Check if ALL members are available at this slot
        let allAvailable = true
        for (const member of membersWithAvailability) {
          const isAvailable = await isMemberAvailableAtSlot(
            member.userId,
            slotStart,
            slotEnd,
            eventType.bufferBefore,
            eventType.bufferAfter
          )
          if (!isAvailable) {
            allAvailable = false
            break
          }
        }

        if (allAvailable) {
          slots.push(dateFns.format(slotStart, "HH:mm"))
        }
      }

      slotStart = dateFns.addMinutes(slotStart, interval)
    }
  }

  return slots
}

/**
 * Intersect two sets of time windows
 */
function intersectWindows(
  windows1: { start: string; end: string }[],
  windows2: { start: string; end: string }[]
): { start: string; end: string }[] {
  const result: { start: string; end: string }[] = []

  for (const w1 of windows1) {
    for (const w2 of windows2) {
      const start = w1.start > w2.start ? w1.start : w2.start
      const end = w1.end < w2.end ? w1.end : w2.end
      
      if (start < end) {
        result.push({ start, end })
      }
    }
  }

  return result
}

/**
 * Create bookings for all team members (collective scheduling)
 */
export async function createCollectiveBooking(
  eventTypeId: string,
  teamId: string,
  guestName: string,
  guestEmail: string,
  guestTimezone: string,
  startTime: Date,
  endTime: Date
): Promise<string[]> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
  })

  const bookingIds: string[] = []

  for (const member of members) {
    const booking = await prisma.booking.create({
      data: {
        eventTypeId,
        hostId: member.userId,
        guestName,
        guestEmail,
        guestTimezone,
        startTime,
        endTime,
        status: "CONFIRMED",
      },
    })
    bookingIds.push(booking.id)
  }

  return bookingIds
}
