import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getHours, getDay } from "date-fns"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get all bookings
    const bookings = await prisma.booking.findMany({
      where: { hostId: userId },
      select: {
        startTime: true,
      },
    })

    // Build heatmap data (day x hour)
    // Days: 0 = Sunday, 6 = Saturday
    // Hours: 0-23
    const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0))

    bookings.forEach(booking => {
      const day = getDay(booking.startTime)
      const hour = getHours(booking.startTime)
      heatmap[day][hour]++
    })

    // Find max for normalization
    const max = Math.max(...heatmap.flat())

    // Format for frontend
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const formattedHeatmap = dayNames.map((dayName, dayIndex) => ({
      day: dayName,
      dayIndex,
      hours: heatmap[dayIndex].map((count, hour) => ({
        hour,
        count,
        intensity: max > 0 ? count / max : 0,
      })),
    }))

    // Find busiest day
    const dayTotals = heatmap.map((hours, index) => ({
      day: dayNames[index],
      total: hours.reduce((a, b) => a + b, 0),
    }))
    const busiestDay = dayTotals.reduce((max, curr) => curr.total > max.total ? curr : max, dayTotals[0])

    // Find busiest hour
    const hourTotals = Array(24).fill(0)
    heatmap.forEach(day => {
      day.forEach((count, hour) => {
        hourTotals[hour] += count
      })
    })
    const busiestHour = hourTotals.reduce(
      (max, count, hour) => count > max.count ? { hour, count } : max,
      { hour: 0, count: 0 }
    )

    return NextResponse.json({
      heatmap: formattedHeatmap,
      summary: {
        busiestDay: busiestDay.day,
        busiestDayCount: busiestDay.total,
        busiestHour: busiestHour.hour,
        busiestHourCount: busiestHour.count,
        busiestHourFormatted: `${busiestHour.hour.toString().padStart(2, '0')}:00`,
      },
    })
  } catch (error) {
    console.error("Error fetching heatmap:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
