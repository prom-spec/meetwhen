import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get event types with booking counts
    const eventTypes = await prisma.eventType.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        color: true,
        duration: true,
        isActive: true,
        _count: {
          select: {
            bookings: true,
            pageViews: true,
          },
        },
      },
    })

    // Get page view breakdown by event type
    const eventsWithStats = await Promise.all(
      eventTypes.map(async (et) => {
        const [views, slotSelections, confirmations] = await Promise.all([
          prisma.pageView.count({
            where: { eventTypeId: et.id, stage: "view" },
          }),
          prisma.pageView.count({
            where: { eventTypeId: et.id, stage: "slot_selected" },
          }),
          prisma.pageView.count({
            where: { eventTypeId: et.id, stage: "booking_confirmed" },
          }),
        ])

        const conversionRate = views > 0 ? (et._count.bookings / views) * 100 : 0

        return {
          id: et.id,
          title: et.title,
          color: et.color,
          duration: et.duration,
          isActive: et.isActive,
          bookings: et._count.bookings,
          views,
          slotSelections,
          confirmations,
          conversionRate: Math.round(conversionRate * 10) / 10,
        }
      })
    )

    // Sort by bookings (most popular first)
    eventsWithStats.sort((a, b) => b.bookings - a.bookings)

    return NextResponse.json({
      events: eventsWithStats,
    })
  } catch (error) {
    apiLogger.error("Error fetching event analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
