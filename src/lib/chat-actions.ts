import prisma from "@/lib/prisma"
import { startOfWeek, startOfMonth } from "date-fns"

export interface ActionResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
  confirmationRequired?: boolean
  confirmationMessage?: string
  actionId?: string
}

// Helper to generate slug from title
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
}

// All chat action definitions with their execute functions
export const chatActions: Record<
  string,
  {
    description: string
    parameters: object
    execute: (params: Record<string, unknown>, userId: string) => Promise<ActionResult>
  }
> = {
  // ── Event Types ──────────────────────────────────────────────
  list_event_types: {
    description: "List all event types configured by the user",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const eventTypes = await prisma.eventType.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          duration: true,
          isActive: true,
          color: true,
          locationType: true,
          _count: { select: { bookings: true } },
        },
      })
      return {
        success: true,
        message: eventTypes.length
          ? `Found ${eventTypes.length} event type(s).`
          : "No event types yet.",
        data: { eventTypes },
      }
    },
  },

  create_event_type: {
    description:
      "Create a new event type / meeting type. Requires title and duration. Optional: description, location type, color, slug.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event type title" },
        duration: { type: "number", description: "Duration in minutes" },
        description: { type: "string", description: "Optional description" },
        slug: { type: "string", description: "URL slug (auto-generated from title if omitted)" },
        locationType: {
          type: "string",
          enum: ["IN_PERSON", "GOOGLE_MEET", "ZOOM", "PHONE", "CUSTOM"],
          description: "Location type, defaults to GOOGLE_MEET",
        },
        locationValue: { type: "string", description: "Address, phone, or URL for the location" },
        color: { type: "string", description: "Hex color e.g. #3B82F6" },
        bufferBefore: { type: "number", description: "Buffer minutes before meeting" },
        bufferAfter: { type: "number", description: "Buffer minutes after meeting" },
        maxDaysAhead: { type: "number", description: "How many days ahead can people book" },
        visibility: { type: "string", enum: ["public", "unlisted"] },
      },
      required: ["title", "duration"],
    },
    execute: async (params, userId) => {
      const title = params.title as string
      const duration = params.duration as number
      const slug = (params.slug as string) || slugify(title)

      // Check duplicate slug
      const existing = await prisma.eventType.findUnique({
        where: { userId_slug: { userId, slug } },
      })
      if (existing) {
        return { success: false, message: `Slug "${slug}" already exists. Try a different title or provide a custom slug.` }
      }

      const eventType = await prisma.eventType.create({
        data: {
          userId,
          title,
          slug,
          duration,
          description: (params.description as string) || null,
          locationType: (params.locationType as string) || "GOOGLE_MEET",
          locationValue: (params.locationValue as string) || null,
          color: (params.color as string) || "#3B82F6",
          bufferBefore: (params.bufferBefore as number) || 0,
          bufferAfter: (params.bufferAfter as number) || 0,
          maxDaysAhead: (params.maxDaysAhead as number) || 60,
          visibility: (params.visibility as string) || "public",
        },
      })

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
      const bookingUrl = user?.username ? `/${user.username}/${eventType.slug}` : null

      return {
        success: true,
        message: `Created "${eventType.title}" (${eventType.duration} min).`,
        data: {
          eventType: {
            id: eventType.id,
            title: eventType.title,
            slug: eventType.slug,
            duration: eventType.duration,
            locationType: eventType.locationType,
          },
          bookingUrl,
          dashboardUrl: "/dashboard/event-types",
        },
      }
    },
  },

  update_event_type: {
    description: "Update an existing event type by its ID or title. Can change title, duration, description, active status, location, etc.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Event type ID" },
        title: { type: "string", description: "Find by title if id not provided" },
        newTitle: { type: "string" },
        duration: { type: "number" },
        description: { type: "string" },
        isActive: { type: "boolean" },
        locationType: { type: "string", enum: ["IN_PERSON", "GOOGLE_MEET", "ZOOM", "PHONE", "CUSTOM"] },
        locationValue: { type: "string" },
        color: { type: "string" },
        bufferBefore: { type: "number" },
        bufferAfter: { type: "number" },
        maxDaysAhead: { type: "number" },
        visibility: { type: "string", enum: ["public", "unlisted"] },
      },
      required: [],
    },
    execute: async (params, userId) => {
      let eventType
      if (params.id) {
        eventType = await prisma.eventType.findFirst({ where: { id: params.id as string, userId } })
      } else if (params.title) {
        eventType = await prisma.eventType.findFirst({
          where: { userId, title: { contains: params.title as string, mode: "insensitive" } },
        })
      }
      if (!eventType) return { success: false, message: "Event type not found." }

      const updateData: Record<string, unknown> = {}
      if (params.newTitle !== undefined) updateData.title = params.newTitle
      if (params.duration !== undefined) updateData.duration = params.duration
      if (params.description !== undefined) updateData.description = params.description
      if (params.isActive !== undefined) updateData.isActive = params.isActive
      if (params.locationType !== undefined) updateData.locationType = params.locationType
      if (params.locationValue !== undefined) updateData.locationValue = params.locationValue
      if (params.color !== undefined) updateData.color = params.color
      if (params.bufferBefore !== undefined) updateData.bufferBefore = params.bufferBefore
      if (params.bufferAfter !== undefined) updateData.bufferAfter = params.bufferAfter
      if (params.maxDaysAhead !== undefined) updateData.maxDaysAhead = params.maxDaysAhead
      if (params.visibility !== undefined) updateData.visibility = params.visibility

      if (Object.keys(updateData).length === 0) {
        return { success: false, message: "No changes specified." }
      }

      const updated = await prisma.eventType.update({ where: { id: eventType.id }, data: updateData })
      return {
        success: true,
        message: `Updated "${updated.title}".`,
        data: { eventType: { id: updated.id, title: updated.title, duration: updated.duration, isActive: updated.isActive } },
      }
    },
  },

  delete_event_type: {
    description: "Delete an event type by ID or title. This is destructive and will remove all associated bookings.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Event type ID" },
        title: { type: "string", description: "Find by title if id not provided" },
        confirmed: { type: "boolean", description: "Must be true to actually delete" },
      },
      required: ["confirmed"],
    },
    execute: async (params, userId) => {
      let eventType
      if (params.id) {
        eventType = await prisma.eventType.findFirst({ where: { id: params.id as string, userId } })
      } else if (params.title) {
        eventType = await prisma.eventType.findFirst({
          where: { userId, title: { contains: params.title as string, mode: "insensitive" } },
        })
      }
      if (!eventType) return { success: false, message: "Event type not found." }

      if (!params.confirmed) {
        return {
          success: false,
          confirmationRequired: true,
          confirmationMessage: `Are you sure you want to delete "${eventType.title}"? This will also remove all its bookings.`,
          message: `Please confirm deletion of "${eventType.title}".`,
          data: { eventTypeId: eventType.id, eventTypeTitle: eventType.title },
        }
      }

      await prisma.eventType.delete({ where: { id: eventType.id } })
      return { success: true, message: `Deleted "${eventType.title}" and all associated bookings.` }
    },
  },

  toggle_event_type: {
    description: "Activate or deactivate an event type",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        isActive: { type: "boolean", description: "true to activate, false to deactivate" },
      },
      required: ["isActive"],
    },
    execute: async (params, userId) => {
      let eventType
      if (params.id) {
        eventType = await prisma.eventType.findFirst({ where: { id: params.id as string, userId } })
      } else if (params.title) {
        eventType = await prisma.eventType.findFirst({
          where: { userId, title: { contains: params.title as string, mode: "insensitive" } },
        })
      }
      if (!eventType) return { success: false, message: "Event type not found." }

      const updated = await prisma.eventType.update({
        where: { id: eventType.id },
        data: { isActive: params.isActive as boolean },
      })
      return {
        success: true,
        message: `"${updated.title}" is now ${updated.isActive ? "active" : "inactive"}.`,
      }
    },
  },

  // ── Availability ─────────────────────────────────────────────
  set_availability: {
    description:
      "Set weekly availability schedule. Provide days (0=Sun..6=Sat) with start/end times, or disable days.",
    parameters: {
      type: "object",
      properties: {
        schedule: {
          type: "array",
          description: "Array of { dayOfWeek, enabled, startTime?, endTime? }",
          items: {
            type: "object",
            properties: {
              dayOfWeek: { type: "number" },
              enabled: { type: "boolean" },
              startTime: { type: "string", description: "HH:mm" },
              endTime: { type: "string", description: "HH:mm" },
            },
          },
        },
      },
      required: ["schedule"],
    },
    execute: async (params, userId) => {
      const schedule = params.schedule as Array<{
        dayOfWeek: number
        enabled: boolean
        startTime?: string
        endTime?: string
      }>

      for (const day of schedule) {
        await prisma.availability.deleteMany({ where: { userId, dayOfWeek: day.dayOfWeek } })
        if (day.enabled) {
          await prisma.availability.create({
            data: {
              userId,
              dayOfWeek: day.dayOfWeek,
              startTime: day.startTime || "09:00",
              endTime: day.endTime || "17:00",
            },
          })
        }
      }

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      const summary = schedule
        .filter((d) => d.enabled)
        .map((d) => `${dayNames[d.dayOfWeek]} ${d.startTime || "09:00"}-${d.endTime || "17:00"}`)
        .join(", ")

      return {
        success: true,
        message: summary ? `Availability set: ${summary}` : "All selected days disabled.",
      }
    },
  },

  get_availability: {
    description: "Get current weekly availability schedule",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const availability = await prisma.availability.findMany({
        where: { userId },
        orderBy: { dayOfWeek: "asc" },
      })
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      const schedule = dayNames.map((name, i) => {
        const slots = availability.filter((a) => a.dayOfWeek === i)
        return {
          day: name,
          dayOfWeek: i,
          enabled: slots.length > 0,
          slots: slots.map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
        }
      })
      return { success: true, message: "Current availability schedule.", data: { schedule } }
    },
  },

  add_date_override: {
    description: "Block a specific date or set custom hours for a date",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        isAvailable: { type: "boolean", description: "false to block, true for custom hours" },
        startTime: { type: "string", description: "Custom start time HH:mm" },
        endTime: { type: "string", description: "Custom end time HH:mm" },
        reason: { type: "string", description: "Reason for override" },
      },
      required: ["date", "isAvailable"],
    },
    execute: async (params, userId) => {
      const dateObj = new Date(params.date as string)
      await prisma.dateOverride.upsert({
        where: { userId_date: { userId, date: dateObj } },
        update: {
          isAvailable: params.isAvailable as boolean,
          startTime: (params.startTime as string) || null,
          endTime: (params.endTime as string) || null,
          reason: (params.reason as string) || null,
        },
        create: {
          userId,
          date: dateObj,
          isAvailable: params.isAvailable as boolean,
          startTime: (params.startTime as string) || null,
          endTime: (params.endTime as string) || null,
          reason: (params.reason as string) || null,
        },
      })
      return {
        success: true,
        message: params.isAvailable
          ? `Set custom hours for ${params.date}: ${params.startTime}-${params.endTime}`
          : `Blocked ${params.date}${params.reason ? ` (${params.reason})` : ""}.`,
      }
    },
  },

  // ── Bookings ─────────────────────────────────────────────────
  list_bookings: {
    description: "List upcoming bookings. Can filter by status.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["CONFIRMED", "PENDING", "CANCELLED", "COMPLETED"], description: "Filter by status" },
        limit: { type: "number", description: "Max results (default 10)" },
        includePast: { type: "boolean", description: "Include past bookings" },
      },
      required: [],
    },
    execute: async (params, userId) => {
      const where: Record<string, unknown> = { hostId: userId }
      if (params.status) {
        where.status = params.status
      } else {
        where.status = { not: "CANCELLED" }
      }
      if (!params.includePast) {
        where.startTime = { gte: new Date() }
      }

      const bookings = await prisma.booking.findMany({
        where,
        orderBy: { startTime: "asc" },
        take: (params.limit as number) || 10,
        include: { eventType: { select: { title: true, duration: true } } },
      })

      return {
        success: true,
        message: bookings.length
          ? `Found ${bookings.length} booking(s).`
          : "No bookings found.",
        data: {
          bookings: bookings.map((b) => ({
            id: b.id,
            eventType: b.eventType.title,
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            startTime: b.startTime.toISOString(),
            endTime: b.endTime.toISOString(),
            status: b.status,
            duration: b.eventType.duration,
          })),
        },
      }
    },
  },

  cancel_booking: {
    description: "Cancel a booking by ID. Requires confirmation.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Booking ID" },
        confirmed: { type: "boolean", description: "Must be true to actually cancel" },
      },
      required: ["id"],
    },
    execute: async (params, userId) => {
      const booking = await prisma.booking.findFirst({
        where: { id: params.id as string, hostId: userId },
        include: { eventType: { select: { title: true } } },
      })
      if (!booking) return { success: false, message: "Booking not found." }
      if (booking.status === "CANCELLED") return { success: false, message: "Booking is already cancelled." }

      if (!params.confirmed) {
        return {
          success: false,
          confirmationRequired: true,
          confirmationMessage: `Cancel "${booking.eventType.title}" with ${booking.guestName} on ${booking.startTime.toLocaleDateString()}?`,
          message: "Please confirm cancellation.",
          data: { bookingId: booking.id },
        }
      }

      await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } })
      return { success: true, message: `Cancelled booking with ${booking.guestName}.` }
    },
  },

  // ── Settings ─────────────────────────────────────────────────
  update_settings: {
    description: "Update user profile settings: name, timezone, brandColor, blockHolidays, holidayCountry, etc.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        timezone: { type: "string" },
        brandColor: { type: "string" },
        blockHolidays: { type: "boolean" },
        holidayCountry: { type: "string", description: "ISO country code e.g. US, IL" },
        hidePoweredBy: { type: "boolean" },
      },
      required: [],
    },
    execute: async (params, userId) => {
      const updateData: Record<string, unknown> = {}
      const fields = ["name", "timezone", "brandColor", "blockHolidays", "holidayCountry", "hidePoweredBy"]
      for (const f of fields) {
        if (params[f] !== undefined) updateData[f] = params[f]
      }
      if (Object.keys(updateData).length === 0) {
        return { success: false, message: "No settings to update." }
      }
      await prisma.user.update({ where: { id: userId }, data: updateData })
      return { success: true, message: `Updated settings: ${Object.keys(updateData).join(", ")}.` }
    },
  },

  get_settings: {
    description: "Get current user profile and settings",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          username: true,
          timezone: true,
          brandColor: true,
          blockHolidays: true,
          holidayCountry: true,
          hidePoweredBy: true,
          calendarSyncEnabled: true,
        },
      })
      return { success: true, message: "Current settings.", data: { settings: user } }
    },
  },

  // ── Workflows ────────────────────────────────────────────────
  list_workflows: {
    description: "List all workflows and their status",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const workflows = await prisma.workflow.findMany({
        where: { userId },
        include: {
          steps: { orderBy: { order: "asc" }, select: { action: true, delay: true } },
          _count: { select: { executions: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      return {
        success: true,
        message: workflows.length ? `Found ${workflows.length} workflow(s).` : "No workflows yet.",
        data: {
          workflows: workflows.map((w) => ({
            id: w.id,
            name: w.name,
            trigger: w.trigger,
            isActive: w.isActive,
            steps: w.steps.length,
            executions: w._count.executions,
          })),
        },
      }
    },
  },

  create_workflow: {
    description: "Create a new workflow automation. Triggers: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, BEFORE_MEETING, AFTER_MEETING. Steps: SEND_EMAIL, SEND_WEBHOOK, WAIT.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Workflow name" },
        trigger: {
          type: "string",
          enum: ["BOOKING_CREATED", "BOOKING_CANCELLED", "BOOKING_RESCHEDULED", "BEFORE_MEETING", "AFTER_MEETING"],
        },
        isActive: { type: "boolean" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              order: { type: "number" },
              action: { type: "string", enum: ["SEND_EMAIL", "SEND_WEBHOOK", "WAIT"] },
              delay: { type: "number", description: "Delay in minutes" },
              config: { type: "object" },
            },
          },
        },
      },
      required: ["name", "trigger", "steps"],
    },
    execute: async (params, userId) => {
      const steps = params.steps as Array<{ order: number; action: string; delay: number; config: Record<string, unknown> }>
      const workflow = await prisma.workflow.create({
        data: {
          userId,
          name: params.name as string,
          trigger: params.trigger as string,
          isActive: params.isActive !== false,
          steps: {
            create: steps.map((s, i) => ({
              order: s.order || i + 1,
              action: s.action,
              delay: s.delay || 0,
              config: s.config || {},
            })),
          },
        },
        include: { steps: true },
      })
      return {
        success: true,
        message: `Created workflow "${workflow.name}" with ${workflow.steps.length} step(s).`,
        data: { workflow: { id: workflow.id, name: workflow.name } },
      }
    },
  },

  toggle_workflow: {
    description: "Activate or deactivate a workflow",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        isActive: { type: "boolean" },
      },
      required: ["isActive"],
    },
    execute: async (params, userId) => {
      let workflow
      if (params.id) {
        workflow = await prisma.workflow.findFirst({ where: { id: params.id as string, userId } })
      } else if (params.name) {
        workflow = await prisma.workflow.findFirst({
          where: { userId, name: { contains: params.name as string, mode: "insensitive" } },
        })
      }
      if (!workflow) return { success: false, message: "Workflow not found." }
      const updated = await prisma.workflow.update({ where: { id: workflow.id }, data: { isActive: params.isActive as boolean } })
      return { success: true, message: `Workflow "${updated.name}" is now ${updated.isActive ? "active" : "inactive"}.` }
    },
  },

  // ── Teams ────────────────────────────────────────────────────
  list_teams: {
    description: "List teams the user belongs to",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const teams = await prisma.team.findMany({
        where: { members: { some: { userId } } },
        include: {
          _count: { select: { members: true, eventTypes: true } },
        },
      })
      return {
        success: true,
        message: teams.length ? `You're in ${teams.length} team(s).` : "No teams yet.",
        data: {
          teams: teams.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            members: t._count.members,
            eventTypes: t._count.eventTypes,
          })),
        },
      }
    },
  },

  create_team: {
    description: "Create a new team",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        slug: { type: "string", description: "URL-friendly slug" },
      },
      required: ["name"],
    },
    execute: async (params, userId) => {
      const name = params.name as string
      const slug = (params.slug as string) || slugify(name)

      const existing = await prisma.team.findUnique({
        where: { ownerId_slug: { ownerId: userId, slug } },
      })
      if (existing) return { success: false, message: `Team slug "${slug}" already exists.` }

      const team = await prisma.team.create({
        data: {
          name,
          slug,
          ownerId: userId,
          members: { create: { userId, role: "OWNER" } },
        },
      })
      return {
        success: true,
        message: `Created team "${team.name}".`,
        data: { team: { id: team.id, name: team.name, slug: team.slug } },
      }
    },
  },

  // ── Analytics ────────────────────────────────────────────────
  get_analytics_summary: {
    description: "Get a quick summary of booking analytics and stats",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const monthStart = startOfMonth(now)

      const [total, thisWeek, thisMonth, upcoming, cancelled] = await Promise.all([
        prisma.booking.count({ where: { hostId: userId } }),
        prisma.booking.count({ where: { hostId: userId, createdAt: { gte: weekStart } } }),
        prisma.booking.count({ where: { hostId: userId, createdAt: { gte: monthStart } } }),
        prisma.booking.count({ where: { hostId: userId, startTime: { gte: now }, status: { in: ["CONFIRMED", "PENDING"] } } }),
        prisma.booking.count({ where: { hostId: userId, status: "CANCELLED" } }),
      ])

      const eventTypeCount = await prisma.eventType.count({ where: { userId } })

      return {
        success: true,
        message: "Analytics summary.",
        data: {
          stats: {
            totalBookings: total,
            thisWeek,
            thisMonth,
            upcoming,
            cancelled,
            eventTypes: eventTypeCount,
          },
        },
      }
    },
  },
}

// Build function definitions for the AI model
export function getFunctionDefinitions() {
  return Object.entries(chatActions).map(([name, action]) => ({
    type: "function" as const,
    function: {
      name,
      description: action.description,
      parameters: action.parameters,
    },
  }))
}

// Execute an action by name
export async function executeAction(
  name: string,
  params: Record<string, unknown>,
  userId: string
): Promise<ActionResult> {
  const action = chatActions[name]
  if (!action) {
    return { success: false, message: `Unknown action: ${name}` }
  }
  try {
    return await action.execute(params, userId)
  } catch (error) {
    console.error(`Chat action "${name}" failed:`, error)
    return { success: false, message: `Action failed: ${error instanceof Error ? error.message : "Unknown error"}` }
  }
}
