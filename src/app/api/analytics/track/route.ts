import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventTypeId, stage, sessionId } = body

    if (!eventTypeId || !stage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate stage
    const validStages = ["view", "slot_selected", "booking_confirmed"]
    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
    }

    // Verify event type exists
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
    })

    if (!eventType) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    // Create page view record
    const pageView = await prisma.pageView.create({
      data: {
        eventTypeId,
        stage,
        sessionId: sessionId || null,
      },
    })

    return NextResponse.json({ success: true, id: pageView.id })
  } catch (error) {
    console.error("Error tracking analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
