import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

// GET /api/webhooks/[id]/deliveries - Get delivery history for a webhook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    // Verify ownership
    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where: { webhookId: id },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.webhookDelivery.count({
        where: { webhookId: id },
      }),
    ])

    return NextResponse.json({
      deliveries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + deliveries.length < total,
      },
    })
  } catch (error) {
    apiLogger.error("Error fetching deliveries:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
