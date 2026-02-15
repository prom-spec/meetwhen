/**
 * MCP HTTP Endpoint for letsmeet.link
 * Validates API key and handles MCP JSON-RPC requests
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashApiKey, isValidApiKeyFormat } from "@/lib/api-keys"
import { mcpRateLimiter, getClientIp } from "@/lib/rate-limit"
import { apiLogger } from "@/lib/logger"

// Base URL for generating booking links
const BASE_URL = process.env.NEXTAUTH_URL || "https://letsmeet.link"

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
  {
    name: "get_my_booking_link",
    description: "Returns the user's booking page URL that can be shared with others.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "find_user",
    description: "Search for a letsmeet.link user by their username.",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "The username to search for" },
      },
      required: ["username"],
    },
  },
  {
    name: "get_user_event_types",
    description: "Get another user's public (active) event types by their username.",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "The username of the user whose event types to retrieve" },
      },
      required: ["username"],
    },
  },
  {
    name: "get_available_slots",
    description: "Get available time slots for booking a specific event type. Returns slots for the next 7 days by default.",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "The username of the host" },
        eventTypeSlug: { type: "string", description: "The slug of the event type" },
        startDate: { type: "string", description: "Start date for availability check (ISO 8601, defaults to today)" },
        endDate: { type: "string", description: "End date for availability check (ISO 8601, defaults to 7 days from start)" },
        timezone: { type: "string", description: "Timezone for the returned slots (defaults to UTC)" },
      },
      required: ["username", "eventTypeSlug"],
    },
  },
  {
    name: "create_booking",
    description: "Book a meeting with another letsmeet.link user.",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "The username of the host" },
        eventTypeSlug: { type: "string", description: "The slug of the event type to book" },
        startTime: { type: "string", description: "Start time of the meeting (ISO 8601)" },
        guestName: { type: "string", description: "Name of the guest booking the meeting" },
        guestEmail: { type: "string", description: "Email of the guest booking the meeting" },
        guestTimezone: { type: "string", description: "Timezone of the guest (defaults to UTC)" },
        notes: { type: "string", description: "Optional notes for the booking" },
      },
      required: ["username", "eventTypeSlug", "startTime", "guestName", "guestEmail"],
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

async function handleGetMyBookingLink(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true },
  })

  if (!user || !user.username) {
    throw new Error("User profile not found or username not set")
  }

  return {
    bookingUrl: `${BASE_URL}/${user.username}`,
    username: user.username,
    name: user.name,
  }
}

async function handleFindUser(_userId: string, args: ToolArgs) {
  const { username } = args as { username: string }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      eventTypes: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          duration: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!user) {
    throw new Error(`User not found: ${username}`)
  }

  return {
    user: {
      username: user.username,
      name: user.name,
      image: user.image,
      bookingUrl: `${BASE_URL}/${user.username}`,
      eventTypes: user.eventTypes.map((et) => ({
        ...et,
        bookingUrl: `${BASE_URL}/${user.username}/${et.slug}`,
      })),
    },
  }
}

async function handleGetUserEventTypes(_userId: string, args: ToolArgs) {
  const { username } = args as { username: string }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      eventTypes: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          duration: true,
          color: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!user) {
    throw new Error(`User not found: ${username}`)
  }

  return {
    eventTypes: user.eventTypes.map((et) => ({
      ...et,
      bookingUrl: `${BASE_URL}/${user.username}/${et.slug}`,
    })),
  }
}

async function handleGetAvailableSlots(_userId: string, args: ToolArgs) {
  const { username, eventTypeSlug, startDate, endDate, timezone = "UTC" } = args as {
    username: string
    eventTypeSlug: string
    startDate?: string
    endDate?: string
    timezone?: string
  }

  // Find the host user and their event type + availability
  const host = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      availability: true,
      dateOverrides: true,
      eventTypes: {
        where: { slug: eventTypeSlug, isActive: true },
      },
    },
  })

  if (!host) {
    throw new Error(`User not found: ${username}`)
  }

  const eventType = host.eventTypes[0]
  if (!eventType) {
    throw new Error(`Event type not found: ${eventTypeSlug}`)
  }

  // Date range for availability check
  const start = startDate ? new Date(startDate) : new Date()
  start.setHours(0, 0, 0, 0)
  
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  end.setHours(23, 59, 59, 999)

  // Get existing bookings for this host in the date range
  const existingBookings = await prisma.booking.findMany({
    where: {
      hostId: host.id,
      status: { not: "CANCELLED" },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { startTime: true, endTime: true },
  })

  // Generate available slots based on availability rules
  const slots: Array<{ startTime: string; endTime: string }> = []
  const duration = eventType.duration // in minutes

  // Iterate through each day
  const currentDay = new Date(start)
  while (currentDay <= end) {
    const dayOfWeek = currentDay.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Find availability rules for this day (from user, not event type)
    const rulesForDay = host.availability.filter(
      (rule: { dayOfWeek: number }) => rule.dayOfWeek === dayOfWeek
    )

    for (const rule of rulesForDay) {
      // Parse start and end times (format: "HH:MM")
      const [startHour, startMin] = rule.startTime.split(":").map(Number)
      const [endHour, endMin] = rule.endTime.split(":").map(Number)

      // Generate slots within this time window
      const windowStart = new Date(currentDay)
      windowStart.setHours(startHour, startMin, 0, 0)

      const windowEnd = new Date(currentDay)
      windowEnd.setHours(endHour, endMin, 0, 0)

      let slotStart = new Date(windowStart)
      while (slotStart.getTime() + duration * 60 * 1000 <= windowEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000)

        // Skip slots in the past
        if (slotStart > new Date()) {
          // Check for conflicts with existing bookings
          const hasConflict = existingBookings.some(
            (booking) =>
              slotStart < booking.endTime && slotEnd > booking.startTime
          )

          if (!hasConflict) {
            slots.push({
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
            })
          }
        }

        // Move to next slot
        slotStart = new Date(slotStart.getTime() + duration * 60 * 1000)
      }
    }

    // Move to next day
    currentDay.setDate(currentDay.getDate() + 1)
  }

  return {
    eventType: {
      title: eventType.title,
      duration: eventType.duration,
      description: eventType.description,
    },
    timezone,
    slots,
    totalSlots: slots.length,
  }
}

async function handleCreateBooking(userId: string, args: ToolArgs) {
  const { username, eventTypeSlug, startTime, guestName, guestEmail, guestTimezone = "UTC", notes } = args as {
    username: string
    eventTypeSlug: string
    startTime: string
    guestName: string
    guestEmail: string
    guestTimezone?: string
    notes?: string
  }

  // Find the host
  const host = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      availability: true,
      eventTypes: {
        where: { slug: eventTypeSlug, isActive: true },
        select: {
          id: true,
          title: true,
          duration: true,
        },
      },
    },
  })

  if (!host) {
    throw new Error(`User not found: ${username}`)
  }

  const eventType = host.eventTypes[0]
  if (!eventType) {
    throw new Error(`Event type not found or inactive: ${eventTypeSlug}`)
  }

  // Calculate end time
  const start = new Date(startTime)
  const end = new Date(start.getTime() + eventType.duration * 60 * 1000)

  // Validate slot falls within host's availability rules
  const dayOfWeek = start.getDay()
  const slotStartMinutes = start.getUTCHours() * 60 + start.getUTCMinutes()
  const slotEndMinutes = slotStartMinutes + eventType.duration

  const rulesForDay = host.availability.filter(
    (rule: { dayOfWeek: number }) => rule.dayOfWeek === dayOfWeek
  )

  if (rulesForDay.length === 0) {
    throw new Error("The host is not available on this day")
  }

  const fitsInWindow = rulesForDay.some((rule: { startTime: string; endTime: string }) => {
    const [rStartH, rStartM] = rule.startTime.split(":").map(Number)
    const [rEndH, rEndM] = rule.endTime.split(":").map(Number)
    const ruleStart = rStartH * 60 + rStartM
    const ruleEnd = rEndH * 60 + rEndM
    return slotStartMinutes >= ruleStart && slotEndMinutes <= ruleEnd
  })

  if (!fitsInWindow) {
    throw new Error("The requested time slot falls outside the host's availability window")
  }

  // Check for conflicts
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      hostId: host.id,
      status: { not: "CANCELLED" },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  })

  if (conflictingBooking) {
    throw new Error("This time slot is no longer available")
  }

  // Create the booking
  const booking = await prisma.booking.create({
    data: {
      hostId: host.id,
      eventTypeId: eventType.id,
      guestName,
      guestEmail,
      guestTimezone,
      startTime: start,
      endTime: end,
      status: "CONFIRMED",
      notes: notes || null,
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      guestName: true,
      guestEmail: true,
    },
  })

  return {
    success: true,
    booking: {
      id: booking.id,
      eventType: eventType.title,
      hostName: host.name,
      hostUsername: host.username,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      status: booking.status,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
    },
  }
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
    case "get_my_booking_link":
      return handleGetMyBookingLink(userId)
    case "find_user":
      return handleFindUser(userId, args)
    case "get_user_event_types":
      return handleGetUserEventTypes(userId, args)
    case "get_available_slots":
      return handleGetAvailableSlots(userId, args)
    case "create_booking":
      return handleCreateBooking(userId, args)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

const CORS_ORIGIN = process.env.NEXTAUTH_URL || "https://www.letsmeet.link"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function jsonRpc(body: object, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { ...corsHeaders, ...init?.headers },
  })
}

export async function POST(req: NextRequest) {
  // Rate limit: 30 requests per IP per minute
  const ip = getClientIp(req)
  const rl = mcpRateLimiter.check(ip)
  if (!rl.allowed) {
    return jsonRpc(
      { jsonrpc: "2.0", error: { code: -32000, message: "Rate limit exceeded" }, id: null },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  // Validate API key
  const authHeader = req.headers.get("authorization")
  const userId = await validateApiKey(authHeader)

  if (!userId) {
    return jsonRpc(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized - invalid or missing API key" }, id: null },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { jsonrpc, method, params, id } = body

    if (jsonrpc !== "2.0") {
      return jsonRpc({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request - must be JSON-RPC 2.0" },
        id: id || null,
      })
    }

    // Handle MCP protocol methods
    if (method === "initialize") {
      return jsonRpc({
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "letsmeet", version: "1.0.0" },
        },
        id,
      })
    }

    if (method === "tools/list") {
      return jsonRpc({
        jsonrpc: "2.0",
        result: { tools: toolDefinitions },
        id,
      })
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params || {}

      if (!name) {
        return jsonRpc({
          jsonrpc: "2.0",
          error: { code: -32602, message: "Missing tool name" },
          id,
        })
      }

      try {
        const result = await handleToolCall(userId, name, args || {})
        return jsonRpc({
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          },
          id,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return jsonRpc({
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
    return jsonRpc({
      jsonrpc: "2.0",
      error: { code: -32601, message: `Method not found: ${method}` },
      id,
    })
  } catch (error) {
    apiLogger.error("MCP error:", error)
    return jsonRpc({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal error" },
      id: null,
    })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
