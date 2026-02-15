import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getPublicHolidays, getCountryFromTimezone } from "@/lib/holidays"
import { apiLogger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const timezone = searchParams.get("timezone") || "UTC"
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10)
  const month = searchParams.get("month") // 0-indexed

  const country = getCountryFromTimezone(timezone)
  if (!country) {
    return NextResponse.json({ holidays: [] })
  }

  const holidays = month !== null
    ? getPublicHolidays(country, year, parseInt(month, 10))
    : getPublicHolidays(country, year)

  return NextResponse.json({ holidays, country })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { blockHolidays } = await request.json()
    const userId = session.user.id

    // Get user's timezone
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timezone = user?.timezone || "UTC"
    const country = getCountryFromTimezone(timezone)

    // Update blockHolidays flag
    await prisma.user.update({
      where: { id: userId },
      data: { blockHolidays: !!blockHolidays },
    })

    if (blockHolidays && country) {
      // Get holidays for current year and next year
      const now = new Date()
      const currentYear = now.getFullYear()
      const holidays = [
        ...getPublicHolidays(country, currentYear),
        ...getPublicHolidays(country, currentYear + 1),
      ]

      // Only future holidays
      const futureHolidays = holidays.filter(h => new Date(h.date) >= new Date(now.toISOString().substring(0, 10)))

      // Create date overrides for each holiday (upsert to avoid duplicates)
      let blockedCount = 0
      for (const holiday of futureHolidays) {
        await prisma.dateOverride.upsert({
          where: {
            userId_date: {
              userId,
              date: new Date(holiday.date),
            },
          },
          update: {
            isAvailable: false,
            startTime: null,
            endTime: null,
            reason: holiday.name,
          },
          create: {
            userId,
            date: new Date(holiday.date),
            isAvailable: false,
            reason: holiday.name,
          },
        })
        blockedCount++
      }

      return NextResponse.json({ success: true, blockedCount, country })
    } else if (!blockHolidays && country) {
      // Remove holiday-based overrides: delete unavailable overrides that match holiday dates
      const now = new Date()
      const currentYear = now.getFullYear()
      const holidays = [
        ...getPublicHolidays(country, currentYear),
        ...getPublicHolidays(country, currentYear + 1),
      ]
      const holidayDates = holidays.map(h => new Date(h.date))

      if (holidayDates.length > 0) {
        await prisma.dateOverride.deleteMany({
          where: {
            userId,
            date: { in: holidayDates },
            isAvailable: false,
          },
        })
      }

      return NextResponse.json({ success: true, blockedCount: 0 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    apiLogger.error("Error toggling holidays:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
