import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { generateWebhookSecret, WEBHOOK_EVENTS, isPrivateUrl } from "@/lib/webhooks"
import { apiLogger } from "@/lib/logger"

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
    apiLogger.error("Error fetching webhooks:", error)
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

    // Plan gating
    const { getPlanFromUser, canAccess } = await import("@/lib/plans")
    const planUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } })
    if (!canAccess(getPlanFromUser(planUser || {}), "webhooks")) {
      return NextResponse.json({ error: "Webhooks require a Pro plan. Upgrade at /dashboard/billing" }, { status: 403 })
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

    if (!url.startsWith("https://")) {
      return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 })
    }

    // SSRF protection: block private/internal URLs
    if (isPrivateUrl(url)) {
      return NextResponse.json({ error: "Webhook URL must not point to private or internal addresses" }, { status: 400 })
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
    const secret = generateWebhookSecret()
    const webhook = await prisma.webhook.create({
      data: {
        userId: session.user.id,
        url,
        events,
        secret,
        active: true,
      },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    })

    // Return secret only once at creation (like Stripe)
    return NextResponse.json({ ...webhook, secret }, { status: 201 })
  } catch (error) {
    apiLogger.error("Error creating webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
