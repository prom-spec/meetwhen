import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { format, subDays, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "week"

    const now = new Date()
    let startDate: Date
    let intervals: Date[]
    let groupBy: "day" | "week" | "month"

    switch (period) {
      case "week":
        startDate = subDays(now, 7)
        intervals = eachDayOfInterval({ start: startDate, end: now })
        groupBy = "day"
        break
      case "month":
        startDate = subDays(now, 30)
        intervals = eachDayOfInterval({ start: startDate, end: now })
        groupBy = "day"
        break
      case "year":
        startDate = subMonths(now, 12)
        intervals = eachMonthOfInterval({ start: startDate, end: now })
        groupBy = "month"
        break
      default:
        startDate = subDays(now, 7)
        intervals = eachDayOfInterval({ start: startDate, end: now })
        groupBy = "day"
    }

    // Get all bookings in the period
    const bookings = await prisma.booking.findMany({
      where: {
        hostId: userId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        status: true,
      },
    })

    // Group bookings by interval
    const data = intervals.map(interval => {
      let intervalStart: Date
      let intervalEnd: Date
      let label: string

      if (groupBy === "day") {
        intervalStart = startOfDay(interval)
        intervalEnd = endOfDay(interval)
        label = format(interval, "MMM d")
      } else if (groupBy === "week") {
        intervalStart = startOfWeek(interval, { weekStartsOn: 1 })
        intervalEnd = endOfWeek(interval, { weekStartsOn: 1 })
        label = format(interval, "MMM d")
      } else {
        intervalStart = startOfMonth(interval)
        intervalEnd = endOfMonth(interval)
        label = format(interval, "MMM yyyy")
      }

      const intervalBookings = bookings.filter(b => 
        b.createdAt >= intervalStart && b.createdAt <= intervalEnd
      )

      return {
        label,
        date: format(interval, "yyyy-MM-dd"),
        total: intervalBookings.length,
        confirmed: intervalBookings.filter(b => b.status === "CONFIRMED").length,
        cancelled: intervalBookings.filter(b => b.status === "CANCELLED").length,
        completed: intervalBookings.filter(b => b.status === "COMPLETED").length,
      }
    })

    return NextResponse.json({
      period,
      data,
    })
  } catch (error) {
    console.error("Error fetching booking trends:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
