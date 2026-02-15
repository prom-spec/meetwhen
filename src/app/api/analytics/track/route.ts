import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { analyticsRateLimiter, getClientIp } from "@/lib/rate-limit"
import { apiLogger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  // Rate limit: 60 requests per IP per minute
  const ip = getClientIp(request)
  const rl = analyticsRateLimiter.check(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

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

    // Try to create record directly; silently handle FK constraint errors
    // (no existence check to prevent event type enumeration)
    try {
      const pageView = await prisma.pageView.create({
        data: {
          eventTypeId,
          stage,
          sessionId: sessionId || null,
        },
      })
      return NextResponse.json({ success: true, id: pageView.id })
    } catch (dbError: unknown) {
      // Foreign key constraint violation — eventTypeId doesn't exist
      // Return success to prevent enumeration
      const code = (dbError as { code?: string })?.code
      if (code === "P2003" || code === "P2025") {
        return NextResponse.json({ success: true, id: null })
      }
      throw dbError
    }
  } catch (error) {
    apiLogger.error("Error tracking analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
