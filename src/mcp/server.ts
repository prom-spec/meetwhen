/**
 * letsmeet.link MCP Server
 * Run with: npx tsx src/mcp/server.ts
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js"
import { PrismaClient } from "@prisma/client"
import { getPlanFromUser, canAccess, requiredPlanFor, PLAN_NAMES, PLAN_PRICES, type Plan, type PlanFeature } from "../lib/plans"
import { PrismaNeon } from "@prisma/adapter-neon"
import * as dateFns from "date-fns"
import { type Plan, type PlanFeature, canAccess, getPlanFromUser, getNumericLimit, PLAN_NAMES, PLAN_PRICES, requiredPlanFor } from "../lib/plans.js"

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL not set")
  // PrismaNeon v7+ accepts connectionString directly, creates pool internally
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter })
}
const prisma = createPrismaClient()
function getUserId(): string {
  const userId = process.env.MCP_USER_ID
  if (!userId) throw new Error("MCP_USER_ID not set")
  return userId
}

async function getUserPlan(): Promise<Plan> {
  const userId = getUserId()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
  return getPlanFromUser(user || {})
}

function upgradeResponse(currentPlan: Plan, requiredFeature: PlanFeature) {
  const needed = requiredPlanFor(requiredFeature)
  return {
    error: "upgrade_required",
    currentPlan: PLAN_NAMES[currentPlan],
    requiredPlan: PLAN_NAMES[needed],
    requiredPlanPrice: PLAN_PRICES[needed],
    message: `This feature requires the ${PLAN_NAMES[needed]} plan (${PLAN_PRICES[needed]}). You're currently on the ${PLAN_NAMES[currentPlan]} plan. Upgrade at https://www.letsmeet.link/dashboard/billing`,
    upgradeUrl: "https://www.letsmeet.link/dashboard/billing",
  }
}

async function checkPlanAccess(feature: PlanFeature): Promise<{ allowed: boolean; plan: Plan; response?: object }> {
  const plan = await getUserPlan()
  if (canAccess(plan, feature)) return { allowed: true, plan }
  return { allowed: false, plan, response: upgradeResponse(plan, feature) }
}

// Plan gating: map tools to required features (null = FREE, no gate)
const TOOL_PLAN_REQUIREMENTS: Record<string, PlanFeature | null> = {
  create_booking: null,
  list_availability: null,
  set_availability: null,
  add_date_override: null,
  get_event_types: null,
  get_bookings: null,
  cancel_booking: null,
  // PRO tools
  create_event_type: null, // gated by maxEventTypes limit instead
  create_webhook: "webhooks",
  manage_contacts: "contacts",
}

async function getUserPlan(): Promise<{ plan: Plan; user: { plan?: string } }> {
  const userId = getUserId()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
  return { plan: getPlanFromUser(user || {}), user: user || {} }
}

function upgradeResponse(feature: string, requiredPlan: Plan, currentPlan: Plan) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        error: "upgrade_required",
        feature,
        requiredPlan,
        requiredPlanName: PLAN_NAMES[requiredPlan],
        requiredPlanPrice: PLAN_PRICES[requiredPlan],
        currentPlan,
        currentPlanName: PLAN_NAMES[currentPlan],
        message: `This feature requires the ${PLAN_NAMES[requiredPlan]} plan (${PLAN_PRICES[requiredPlan]}). You are currently on the ${PLAN_NAMES[currentPlan]} plan. Upgrade at: https://www.letsmeet.link/dashboard/billing`,
        upgradeUrl: "https://www.letsmeet.link/dashboard/billing",
      }, null, 2),
    }],
    isError: true,
  }
}

async function checkPlanGate(toolName: string): Promise<ReturnType<typeof upgradeResponse> | null> {
  const requiredFeature = TOOL_PLAN_REQUIREMENTS[toolName]
  if (!requiredFeature) return null

  const { plan } = await getUserPlan()
  if (canAccess(plan, requiredFeature)) return null

  return upgradeResponse(requiredFeature, requiredPlanFor(requiredFeature), plan)
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
    name: "get_plan",
    description: "Get the user's current subscription plan and available features.",
    inputSchema: { type: "object" as const, properties: {}, required: [] },
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
  {
    name: "create_event_type",
    description: "Create a new event type. Free plan limited to 1 event type; Pro plan allows unlimited.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Event type name (e.g. '30 Minute Meeting')" },
        slug: { type: "string", description: "URL slug (lowercase, hyphens only)" },
        duration: { type: "number", description: "Duration in minutes" },
        description: { type: "string", description: "Optional description" },
        locationType: { type: "string", enum: ["GOOGLE_MEET", "ZOOM", "IN_PERSON", "PHONE", "CUSTOM"], description: "Meeting location type. Default: GOOGLE_MEET" },
      },
      required: ["title", "slug", "duration"],
    },
  },
  {
    name: "create_webhook",
    description: "Create a webhook endpoint to receive booking events. Requires Pro plan.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Webhook endpoint URL" },
        events: { type: "array", items: { type: "string" }, description: "Events to subscribe to: booking.created, booking.cancelled, booking.rescheduled" },
      },
      required: ["url", "events"],
    },
  },
  {
    name: "manage_contacts",
    description: "List or search contacts. Requires Pro plan.",
    inputSchema: {
      type: "object" as const,
      properties: {
        search: { type: "string", description: "Search by name or email" },
        limit: { type: "number", description: "Max results. Default 20" },
      },
      required: [],
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

async function createEventType(params: {
  title: string
  slug: string
  duration: number
  description?: string
  locationType?: string
}) {
  const userId = getUserId()

  // Check event type limit
  const { plan } = await getUserPlan()
  const maxAllowed = getNumericLimit(plan, "maxEventTypes")
  const existingCount = await prisma.eventType.count({ where: { userId } })
  if (existingCount >= maxAllowed) {
    return {
      error: "upgrade_required",
      feature: "maxEventTypes",
      currentCount: existingCount,
      maxAllowed,
      currentPlan: plan,
      message: `You've reached your limit of ${maxAllowed} event type${maxAllowed === 1 ? "" : "s"} on the ${PLAN_NAMES[plan]} plan. Upgrade to create more.`,
      upgradeUrl: "https://www.letsmeet.link/dashboard/billing",
    }
  }

  const eventType = await prisma.eventType.create({
    data: {
      userId,
      title: params.title,
      slug: params.slug,
      duration: params.duration,
      description: params.description || null,
      locationType: (params.locationType as any) || "GOOGLE_MEET",
      color: "#3B82F6",
      isActive: true,
    },
  })

  return { success: true, eventType: { id: eventType.id, title: eventType.title, slug: eventType.slug, duration: eventType.duration } }
}

async function createWebhookMcp(params: { url: string; events: string[] }) {
  const userId = getUserId()
  const { randomBytes } = await import("crypto")

  const webhook = await prisma.webhook.create({
    data: {
      userId,
      url: params.url,
      events: params.events,
      secret: randomBytes(32).toString("hex"),
      active: true,
    },
  })

  return { success: true, webhook: { id: webhook.id, url: webhook.url, events: webhook.events, active: webhook.active } }
}

async function manageContacts(params: { search?: string; limit?: number }) {
  const userId = getUserId()
  const limit = params.limit || 20
  const where: Record<string, unknown> = { userId }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, name: true, email: true, phone: true, company: true, _count: { select: { bookings: true } } },
  })

  return { contacts }
}

// Main server setup
const server = new Server(
  { name: "letsmeet-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

// Type definitions for tool arguments
type CreateBookingArgs = {
  eventTypeId: string
  date: string
  time: string
  name: string
  email: string
  notes?: string
  timezone?: string
}
type ListAvailabilityArgs = { eventTypeId: string; date: string }
type SetAvailabilityArgs = { dayOfWeek: number; startTime: string; endTime: string; enabled: boolean }
type AddDateOverrideArgs = { date: string; isAvailable: boolean; startTime?: string; endTime?: string }
type GetBookingsArgs = { status?: string; limit?: number }
type CancelBookingArgs = { bookingId: string; reason?: string }

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    let result: unknown

    switch (name) {
      case "get_plan": {
        const plan = await getUserPlan()
        const features = await import("../lib/plans").then(m => m.PLAN_FEATURES[plan])
        result = {
          plan: PLAN_NAMES[plan],
          features,
          upgradeUrl: plan !== "ENTERPRISE" ? "https://www.letsmeet.link/dashboard/billing" : undefined,
          message: plan === "FREE"
            ? "You're on the Free plan. Upgrade to Pro ($1/mo) for unlimited event types, workflows, webhooks, and more."
            : plan === "PRO"
            ? "You're on the Pro plan. Upgrade to Enterprise ($3/seat/mo) for teams, SSO, audit logs, and more."
            : "You're on the Enterprise plan with all features."
        }
        break
      }
      case "create_booking":
        result = await createBooking(args as CreateBookingArgs)
        break
      case "list_availability":
        result = await listAvailability(args as ListAvailabilityArgs)
        break
      case "set_availability": {
        const check = await checkPlanAccess("workflows")
        if (!check.allowed) { result = check.response; break }
        result = await setAvailability(args as SetAvailabilityArgs)
        break
      }
      case "add_date_override":
        result = await addDateOverride(args as AddDateOverrideArgs)
        break
      case "get_event_types":
        result = await getEventTypes()
        break
      case "get_bookings":
        result = await getBookings(args as GetBookingsArgs)
        break
      case "cancel_booking":
        result = await cancelBooking(args as CancelBookingArgs)
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
  console.error("letsmeet.link MCP Server running on stdio")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
