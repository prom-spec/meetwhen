import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { startOfWeek, startOfMonth, subDays } from "date-fns"
import { apiLogger } from "@/lib/logger"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)

    // Get user's event type IDs
    const eventTypes = await prisma.eventType.findMany({
      where: { userId },
      select: { id: true },
    })
    const eventTypeIds = eventTypes.map(et => et.id)

    // Bookings stats
    const [
      totalBookings,
      weekBookings,
      monthBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
    ] = await Promise.all([
      prisma.booking.count({
        where: { hostId: userId },
      }),
      prisma.booking.count({
        where: {
          hostId: userId,
          createdAt: { gte: weekStart },
        },
      }),
      prisma.booking.count({
        where: {
          hostId: userId,
          createdAt: { gte: monthStart },
        },
      }),
      prisma.booking.count({
        where: {
          hostId: userId,
          startTime: { gte: now },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      }),
      prisma.booking.count({
        where: {
          hostId: userId,
          status: "COMPLETED",
        },
      }),
      prisma.booking.count({
        where: {
          hostId: userId,
          status: "CANCELLED",
        },
      }),
    ])

    // Page views and conversion stats
    let totalViews = 0
    let totalSlotSelections = 0
    let totalConfirmations = 0

    if (eventTypeIds.length > 0) {
      const [views, slotSelections, confirmations] = await Promise.all([
        prisma.pageView.count({
          where: {
            eventTypeId: { in: eventTypeIds },
            stage: "view",
          },
        }),
        prisma.pageView.count({
          where: {
            eventTypeId: { in: eventTypeIds },
            stage: "slot_selected",
          },
        }),
        prisma.pageView.count({
          where: {
            eventTypeId: { in: eventTypeIds },
            stage: "booking_confirmed",
          },
        }),
      ])
      totalViews = views
      totalSlotSelections = slotSelections
      totalConfirmations = confirmations
    }

    // Calculate conversion rates
    const viewToSlotRate = totalViews > 0 ? (totalSlotSelections / totalViews) * 100 : 0
    const slotToBookingRate = totalSlotSelections > 0 ? (totalConfirmations / totalSlotSelections) * 100 : 0
    const overallConversionRate = totalViews > 0 ? (totalBookings / totalViews) * 100 : 0

    return NextResponse.json({
      bookings: {
        total: totalBookings,
        thisWeek: weekBookings,
        thisMonth: monthBookings,
        upcoming: upcomingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      funnel: {
        views: totalViews,
        slotSelections: totalSlotSelections,
        confirmations: totalConfirmations,
        viewToSlotRate: Math.round(viewToSlotRate * 10) / 10,
        slotToBookingRate: Math.round(slotToBookingRate * 10) / 10,
        overallConversionRate: Math.round(overallConversionRate * 10) / 10,
      },
    })
  } catch (error) {
    apiLogger.error("Error fetching analytics summary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
