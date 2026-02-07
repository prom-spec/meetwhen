import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { WEBHOOK_EVENTS } from "@/lib/webhooks"

// GET /api/webhooks/[id] - Get a single webhook
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

    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    return NextResponse.json(webhook)
  } catch (error) {
    console.error("Error fetching webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/webhooks/[id] - Update a webhook
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.webhook.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    const updates: { url?: string; events?: string[]; active?: boolean } = {}

    // Validate and set URL if provided
    if (body.url !== undefined) {
      if (!body.url || typeof body.url !== "string") {
        return NextResponse.json({ error: "URL is required" }, { status: 400 })
      }

      try {
        new URL(body.url)
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
      }

      if (!body.url.startsWith("https://") && !body.url.startsWith("http://localhost")) {
        return NextResponse.json({ error: "URL must use HTTPS (except localhost)" }, { status: 400 })
      }

      updates.url = body.url
    }

    // Validate events if provided
    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return NextResponse.json({ error: "At least one event is required" }, { status: 400 })
      }

      const validEvents = WEBHOOK_EVENTS.map((e) => e.value)
      const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e as never))
      if (invalidEvents.length > 0) {
        return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(", ")}` }, { status: 400 })
      }

      updates.events = body.events
    }

    // Set active status if provided
    if (body.active !== undefined) {
      updates.active = Boolean(body.active)
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json(webhook)
  } catch (error) {
    console.error("Error updating webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/webhooks/[id] - Delete a webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existing = await prisma.webhook.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    await prisma.webhook.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
