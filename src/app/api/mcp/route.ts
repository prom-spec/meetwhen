/**
 * MCP HTTP Endpoint for MeetWhen
 * Validates API key and handles MCP JSON-RPC requests
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashApiKey, isValidApiKeyFormat } from "@/lib/api-keys"

// Validate API key and get user ID
async function validateApiKey(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const key = authHeader.substring(7)
  if (!isValidApiKeyFormat(key)) {
    return null
  }

  const keyHash = hashApiKey(key)
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { userId: true, revokedAt: true, id: true },
  })

  if (!apiKey || apiKey.revokedAt) {
    return null
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return apiKey.userId
}

// Tool definitions for MCP
const toolDefinitions = [
  {
    name: "get_event_types",
    description: "List all event types (meeting templates) configured by the user.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_bookings",
    description: "Get upcoming bookings. Can filter by status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"], description: "Filter by status" },
        limit: { type: "number", description: "Maximum number of bookings to return (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "cancel_booking",
    description: "Cancel an existing booking by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        bookingId: { type: "string", description: "The booking ID to cancel" },
        reason: { type: "string", description: "Reason for cancellation (optional)" },
      },
      required: ["bookingId"],
    },
  },
]

// Tool handlers
type ToolArgs = Record<string, unknown>

async function handleGetEventTypes(userId: string) {
  const eventTypes = await prisma.eventType.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      duration: true,
      color: true,
      isActive: true,
    },
  })
  return { eventTypes }
}

async function handleGetBookings(userId: string, args: ToolArgs) {
  const limit = Math.min((args.limit as number) || 20, 100)
  const where: Record<string, unknown> = {
    hostId: userId,
    startTime: { gte: new Date() },
  }
  
  if (args.status) {
    where.status = args.status
  } else {
    where.status = { not: "CANCELLED" }
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { startTime: "asc" },
    take: limit,
    include: {
      eventType: { select: { title: true, duration: true } },
    },
  })

  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      eventType: b.eventType.title,
      guestName: b.guestName,
      guestEmail: b.guestEmail,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
      notes: b.notes,
    })),
  }
}

async function handleCancelBooking(userId: string, args: ToolArgs) {
  const { bookingId, reason } = args as { bookingId: string; reason?: string }
  
  // Verify ownership
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, hostId: userId },
  })

  if (!booking) {
    throw new Error("Booking not found")
  }

  if (booking.status === "CANCELLED") {
    throw new Error("Booking is already cancelled")
  }

  // Cancel the booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      notes: reason ? `${booking.notes || ""}\n\nCancellation reason: ${reason}`.trim() : booking.notes,
    },
  })

  return { success: true, message: "Booking cancelled successfully" }
}

// Main tool dispatcher
async function handleToolCall(userId: string, name: string, args: ToolArgs) {
  switch (name) {
    case "get_event_types":
      return handleGetEventTypes(userId)
    case "get_bookings":
      return handleGetBookings(userId, args)
    case "cancel_booking":
      return handleCancelBooking(userId, args)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

export async function POST(req: NextRequest) {
  // Validate API key
  const authHeader = req.headers.get("authorization")
  const userId = await validateApiKey(authHeader)

  if (!userId) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized - invalid or missing API key" }, id: null },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { jsonrpc, method, params, id } = body

    if (jsonrpc !== "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request - must be JSON-RPC 2.0" },
        id: id || null,
      })
    }

    // Handle MCP protocol methods
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "meetwhen", version: "1.0.0" },
        },
        id,
      })
    }

    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: { tools: toolDefinitions },
        id,
      })
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params || {}

      if (!name) {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: { code: -32602, message: "Missing tool name" },
          id,
        })
      }

      try {
        const result = await handleToolCall(userId, name, args || {})
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          },
          id,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: JSON.stringify({ error: message }) }],
            isError: true,
          },
          id,
        })
      }
    }

    // Unknown method
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32601, message: `Method not found: ${method}` },
      id,
    })
  } catch (error) {
    console.error("MCP error:", error)
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal error" },
      id: null,
    })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
