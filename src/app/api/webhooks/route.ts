import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { generateWebhookSecret, WEBHOOK_EVENTS, isPrivateUrl } from "@/lib/webhooks"

// GET /api/webhooks - List all webhooks for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const webhooks = await prisma.webhook.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        _count: {
          select: { deliveries: true },
        },
      },
    })

    // Get recent delivery stats for each webhook
    const webhooksWithStats = await Promise.all(
      webhooks.map(async (webhook) => {
        const recentDeliveries = await prisma.webhookDelivery.findMany({
          where: { webhookId: webhook.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { status: true, createdAt: true },
        })

        const successCount = recentDeliveries.filter((d) => d.status === "SUCCESS").length
        const failedCount = recentDeliveries.filter((d) => d.status === "FAILED").length

        return {
          ...webhook,
          stats: {
            totalDeliveries: webhook._count.deliveries,
            recentSuccess: successCount,
            recentFailed: failedCount,
            lastDelivery: recentDeliveries[0]?.createdAt || null,
          },
        }
      })
    )

    return NextResponse.json(webhooksWithStats)
  } catch (error) {
    console.error("Error fetching webhooks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { url, events } = body

    // Validate URL
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    if (!url.startsWith("https://") && !url.startsWith("http://localhost")) {
      return NextResponse.json({ error: "URL must use HTTPS (except localhost)" }, { status: 400 })
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "At least one event is required" }, { status: 400 })
    }

    const validEvents = WEBHOOK_EVENTS.map((e) => e.value)
    const invalidEvents = events.filter((e) => !validEvents.includes(e))
    if (invalidEvents.length > 0) {
      return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(", ")}` }, { status: 400 })
    }

    // Check webhook limit (max 10 per user)
    const existingCount = await prisma.webhook.count({
      where: { userId: session.user.id },
    })

    if (existingCount >= 10) {
      return NextResponse.json({ error: "Maximum 10 webhooks allowed" }, { status: 400 })
    }

    // Create webhook
    const webhook = await prisma.webhook.create({
      data: {
        userId: session.user.id,
        url,
        events,
        secret: generateWebhookSecret(),
        active: true,
      },
    })

    return NextResponse.json(webhook, { status: 201 })
  } catch (error) {
    console.error("Error creating webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
