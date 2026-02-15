import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const eventType = await prisma.eventType.findUnique({
      where: { id, isActive: true },
      include: {
        user: {
          select: {
            name: true,
            username: true,
            timezone: true,
            brandColor: true,
            brandLogo: true,
            hidePoweredBy: true,
          },
        },
      },
    })

    if (!eventType) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    return NextResponse.json({
      eventType: {
        id: eventType.id,
        title: eventType.title,
        duration: eventType.duration,
        description: eventType.description,
        location: eventType.location,
        allowRecurring: eventType.allowRecurring,
        recurrenceOptions: eventType.recurrenceOptions,
      },
      host: {
        name: eventType.user.name,
        username: eventType.user.username,
        brandColor: eventType.user.brandColor,
        brandLogo: eventType.user.brandLogo,
        hidePoweredBy: eventType.user.hidePoweredBy,
      },
      hostTimezone: eventType.user.timezone,
    })
  } catch (error) {
    apiLogger.error("Error fetching event type:", error)
    return NextResponse.json({ error: "Failed to fetch event type" }, { status: 500 })
  }
}
