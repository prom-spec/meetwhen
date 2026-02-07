/**
 * CalClone MCP Server
 * Run with: npx tsx src/mcp/server.ts
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js"
import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { Pool } from "@neondatabase/serverless"
import * as dateFns from "date-fns"

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL not set")
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter })
}
const prisma = createPrismaClient()
function getUserId(): string {
  const userId = process.env.MCP_USER_ID
  if (!userId) throw new Error("MCP_USER_ID not set")
  return userId
}

const tools: Tool[] = [
  {
    name: "create_booking",
    description: "Book a meeting. Creates a new booking for a specific event type at the specified date and time.",
    inputSchema: {
      type: "object" as const,
      properties: {
        eventTypeId: { type: "string", description: "The ID of the event type to book" },
        date: { type: "string", description: "Date (YYYY-MM-DD format)" },
        time: { type: "string", description: "Start time (HH:mm format, 24-hour)" },
        name: { type: "string", description: "Guest full name" },
        email: { type: "string", description: "Guest email address" },
        notes: { type: "string", description: "Optional notes for the meeting" },
        timezone: { type: "string", description: "Guest timezone. Defaults to UTC" },
      },
      required: ["eventTypeId", "date", "time", "name", "email"],
    },
  },
  {
    name: "list_availability",
    description: "Get available time slots for a specific date and event type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        eventTypeId: { type: "string", description: "Event type ID" },
        date: { type: "string", description: "Date (YYYY-MM-DD format)" },
      },
      required: ["eventTypeId", "date"],
    },
  },
  {
    name: "set_availability",
    description: "Set or modify weekly recurring availability for a specific day.",
    inputSchema: {
      type: "object" as const,
      properties: {
        dayOfWeek: { type: "number", description: "Day of week (0=Sunday..6=Saturday)" },
        startTime: { type: "string", description: "Start time (HH:mm format)" },
        endTime: { type: "string", description: "End time (HH:mm format)" },
        enabled: { type: "boolean", description: "Enable or disable this slot" },
      },
      required: ["dayOfWeek", "startTime", "endTime", "enabled"],
    },
  },
  {
    name: "add_date_override",
    description: "Add a date override to mark a date unavailable or set custom hours.",
    inputSchema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date (YYYY-MM-DD format)" },
        isAvailable: { type: "boolean", description: "Whether available on this date" },
        startTime: { type: "string", description: "Custom start time if available" },
        endTime: { type: "string", description: "Custom end time if available" },
      },
      required: ["date", "isAvailable"],
    },
  },
  {
    name: "get_event_types",
    description: "List all event types configured by the user.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_bookings",
    description: "Get upcoming bookings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"], description: "Filter by status" },
        limit: { type: "number", description: "Max bookings to return. Default 20" },
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
        bookingId: { type: "string", description: "Booking ID to cancel" },
        reason: { type: "string", description: "Optional cancellation reason" },
      },
      required: ["bookingId"],
    },
  },
]

// Tool handlers
async function createBooking(params: {
  eventTypeId: string
  date: string
  time: string
  name: string
  email: string
  notes?: string
  timezone?: string
}) {
  const userId = getUserId()
  const eventType = await prisma.eventType.findFirst({
    where: { id: params.eventTypeId, userId, isActive: true },
  })
  if (!eventType) throw new Error("Event type not found or inactive")

  const [hour, minute] = params.time.split(":").map(Number)
  const startTime = dateFns.setMinutes(
    dateFns.setHours(dateFns.parse(params.date, "yyyy-MM-dd", new Date()), hour),
    minute
  )
  const endTime = dateFns.addMinutes(startTime, eventType.duration)

  const now = new Date()
  const minBookingTime = dateFns.addMinutes(now, eventType.minNotice)
  if (dateFns.isBefore(startTime, minBookingTime)) {
    throw new Error(`Booking must be at least ${eventType.minNotice} minutes in advance`)
  }

  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      hostId: userId,
      status: { not: "CANCELLED" },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  })
  if (conflictingBooking) throw new Error("Time slot is no longer available")

  const booking = await prisma.booking.create({
    data: {
      eventTypeId: params.eventTypeId,
      hostId: userId,
      guestName: params.name,
      guestEmail: params.email,
      guestTimezone: params.timezone || "UTC",
      startTime,
      endTime,
      status: "CONFIRMED",
      notes: params.notes || null,
    },
    include: { eventType: { select: { title: true, duration: true } } },
  })

  return {
    success: true,
    booking: {
      id: booking.id,
      eventType: booking.eventType.title,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      duration: booking.eventType.duration,
      status: booking.status,
    },
  }
}

async function listAvailability(params: { eventTypeId: string; date: string }) {
  const userId = getUserId()
  const eventType = await prisma.eventType.findFirst({
    where: { id: params.eventTypeId, userId, isActive: true },
  })
  if (!eventType) throw new Error("Event type not found or inactive")

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { availability: true, dateOverrides: true },
  })
  if (!user) throw new Error("User not found")

  const requestedDate = dateFns.parse(params.date, "yyyy-MM-dd", new Date())
  const now = new Date()
  const minBookingDate = dateFns.addMinutes(now, eventType.minNotice)
  const maxBookingDate = dateFns.addDays(now, eventType.maxDaysAhead)

  if (dateFns.isAfter(dateFns.startOfDay(requestedDate), dateFns.endOfDay(maxBookingDate))) {
    return { slots: [], message: "Date is beyond the maximum booking window" }
  }

  const dayOfWeek = requestedDate.getDay()
  const dateOverride = user.dateOverrides.find(
    (d) => dateFns.format(d.date, "yyyy-MM-dd") === params.date
  )

  let availableWindows: { start: string; end: string }[] = []
  if (dateOverride) {
    if (dateOverride.isAvailable && dateOverride.startTime && dateOverride.endTime) {
      availableWindows = [{ start: dateOverride.startTime, end: dateOverride.endTime }]
    }
  } else {
    availableWindows = user.availability
      .filter((a) => a.dayOfWeek === dayOfWeek)
      .map((a) => ({ start: a.startTime, end: a.endTime }))
  }

  if (availableWindows.length === 0) {
    return { slots: [], message: "No availability configured for this day" }
  }

  const existingBookings = await prisma.booking.findMany({
    where: {
      hostId: userId,
      status: { not: "CANCELLED" },
      startTime: { gte: dateFns.startOfDay(requestedDate), lte: dateFns.endOfDay(requestedDate) },
    },
    select: { startTime: true, endTime: true },
  })

  const slots: string[] = []
  const { duration, bufferBefore, bufferAfter } = eventType

  for (const window of availableWindows) {
    const [startHour, startMinute] = window.start.split(":").map(Number)
    const [endHour, endMinute] = window.end.split(":").map(Number)
    let slotStart = dateFns.setMinutes(dateFns.setHours(requestedDate, startHour), startMinute)
    const windowEnd = dateFns.setMinutes(dateFns.setHours(requestedDate, endHour), endMinute)

    while (dateFns.addMinutes(slotStart, duration) <= windowEnd) {
      const slotEnd = dateFns.addMinutes(slotStart, duration)
      const slotWithBufferStart = dateFns.addMinutes(slotStart, -bufferBefore)
      const slotWithBufferEnd = dateFns.addMinutes(slotEnd, bufferAfter)

      if (dateFns.isAfter(slotStart, minBookingDate)) {
        const hasConflict = existingBookings.some(
          (b) => slotWithBufferStart < new Date(b.endTime) && slotWithBufferEnd > new Date(b.startTime)
        )
        if (!hasConflict) slots.push(dateFns.format(slotStart, "HH:mm"))
      }
      slotStart = dateFns.addMinutes(slotStart, duration <= 30 ? 15 : 30)
    }
  }

  return { date: params.date, eventType: eventType.title, duration: eventType.duration, slots, timezone: user.timezone }
}

async function setAvailability(params: {
  dayOfWeek: number
  startTime: string
  endTime: string
  enabled: boolean
}) {
  const userId = getUserId()
  if (params.dayOfWeek < 0 || params.dayOfWeek > 6) {
    throw new Error("dayOfWeek must be between 0 (Sunday) and 6 (Saturday)")
  }

  if (!params.enabled) {
    await prisma.availability.deleteMany({
      where: { userId, dayOfWeek: params.dayOfWeek, startTime: params.startTime },
    })
    return { success: true, message: `Removed availability for day ${params.dayOfWeek} at ${params.startTime}` }
  }

  const existing = await prisma.availability.findFirst({
    where: { userId, dayOfWeek: params.dayOfWeek, startTime: params.startTime },
  })

  if (existing) {
    await prisma.availability.update({
      where: { id: existing.id },
      data: { endTime: params.endTime },
    })
  } else {
    await prisma.availability.create({
      data: { userId, dayOfWeek: params.dayOfWeek, startTime: params.startTime, endTime: params.endTime },
    })
  }

  return {
    success: true,
    availability: { dayOfWeek: params.dayOfWeek, startTime: params.startTime, endTime: params.endTime, enabled: true },
  }
}

async function addDateOverride(params: {
  date: string
  isAvailable: boolean
  startTime?: string
  endTime?: string
}) {
  const userId = getUserId()
  const dateObj = new Date(params.date)
  if (isNaN(dateObj.getTime())) throw new Error("Invalid date format. Use YYYY-MM-DD.")

  const override = await prisma.dateOverride.upsert({
    where: { userId_date: { userId, date: dateObj } },
    update: { isAvailable: params.isAvailable, startTime: params.startTime || null, endTime: params.endTime || null },
    create: { userId, date: dateObj, isAvailable: params.isAvailable, startTime: params.startTime || null, endTime: params.endTime || null },
  })

  return {
    success: true,
    override: { date: params.date, isAvailable: override.isAvailable, startTime: override.startTime, endTime: override.endTime },
  }
}

async function getEventTypes() {
  const userId = getUserId()
  const eventTypes = await prisma.eventType.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, slug: true, description: true, duration: true,
      color: true, location: true, isActive: true, bufferBefore: true,
      bufferAfter: true, minNotice: true, maxDaysAhead: true,
    },
  })
  return { eventTypes }
}

async function getBookings(params: { status?: string; limit?: number }) {
  const userId = getUserId()
  const limit = params.limit || 20
  const where: Record<string, unknown> = { hostId: userId, startTime: { gte: new Date() } }
  if (params.status) where.status = params.status
  else where.status = { not: "CANCELLED" }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { startTime: "asc" },
    take: limit,
    include: { eventType: { select: { title: true, duration: true } } },
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

async function cancelBooking(params: { bookingId: string; reason?: string }) {
  const userId = getUserId()
  const booking = await prisma.booking.findFirst({
    where: { id: params.bookingId, hostId: userId },
  })
  if (!booking) throw new Error("Booking not found")
  if (booking.status === "CANCELLED") throw new Error("Booking is already cancelled")

  await prisma.booking.update({
    where: { id: params.bookingId },
    data: {
      status: "CANCELLED",
      notes: params.reason ? `${booking.notes || ""}\nCancellation reason: ${params.reason}`.trim() : booking.notes,
    },
  })

  return { success: true, message: `Booking ${params.bookingId} has been cancelled` }
}

// Main server setup
const server = new Server(
  { name: "calclone-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    let result: unknown

    switch (name) {
      case "create_booking":
        result = await createBooking(args as any)
        break
      case "list_availability":
        result = await listAvailability(args as any)
        break
      case "set_availability":
        result = await setAvailability(args as any)
        break
      case "add_date_override":
        result = await addDateOverride(args as any)
        break
      case "get_event_types":
        result = await getEventTypes()
        break
      case "get_bookings":
        result = await getBookings(args as any)
        break
      case "cancel_booking":
        result = await cancelBooking(args as any)
        break
      default:
        throw new Error(`Unknown tool: ${name}`)
    }

    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }], isError: true }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("CalClone MCP Server running on stdio")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
