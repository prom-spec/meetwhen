import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { sendTestWebhook } from "@/lib/webhooks"
import { apiLogger } from "@/lib/logger"

// POST /api/webhooks/[id]/test - Send a test webhook
export async function POST(
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
    const webhook = await prisma.webhook.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    const result = await sendTestWebhook(id)

    if (result.success) {
      return NextResponse.json({ success: true, message: "Test webhook delivered successfully" })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 200 })
    }
  } catch (error) {
    apiLogger.error("Error sending test webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
