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

  // ── Polls ──────────────────────────────────────────────────────
  list_polls: {
    description: "List user's meeting polls",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const polls = await prisma.meetingPoll.findMany({
        where: { createdBy: userId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { options: true, votes: true } } },
      })
      return {
        success: true,
        message: polls.length ? `Found ${polls.length} poll(s).` : "No polls yet.",
        data: {
          polls: polls.map((p) => ({
            id: p.id, title: p.title, status: p.status, duration: p.duration,
            options: p._count.options, votes: p._count.votes, createdAt: p.createdAt.toISOString(),
          })),
        },
      }
    },
  },

  create_poll: {
    description: "Create a new meeting poll with title, options (dates/times), and optional description",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Poll title" },
        description: { type: "string" },
        duration: { type: "number", description: "Meeting duration in minutes" },
        timezone: { type: "string", description: "Timezone, defaults to user timezone" },
        options: {
          type: "array", description: "Array of {startTime, endTime} ISO strings",
          items: { type: "object", properties: { startTime: { type: "string" }, endTime: { type: "string" } } },
        },
      },
      required: ["title", "options"],
    },
    execute: async (params, userId) => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } })
      const options = params.options as Array<{ startTime: string; endTime: string }>
      const poll = await prisma.meetingPoll.create({
        data: {
          title: params.title as string,
          description: (params.description as string) || null,
          duration: (params.duration as number) || 30,
          timezone: (params.timezone as string) || user?.timezone || "UTC",
          createdBy: userId,
          options: { create: options.map((o) => ({ startTime: new Date(o.startTime), endTime: new Date(o.endTime) })) },
        },
      })
      return { success: true, message: `Created poll "${poll.title}" with ${options.length} option(s).`, data: { pollId: poll.id } }
    },
  },

  delete_poll: {
    description: "Delete a meeting poll. Requires confirmation.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Poll ID" },
        confirmed: { type: "boolean", description: "Must be true to delete" },
      },
      required: ["id"],
    },
    execute: async (params, userId) => {
      const poll = await prisma.meetingPoll.findFirst({ where: { id: params.id as string, createdBy: userId } })
      if (!poll) return { success: false, message: "Poll not found." }
      if (!params.confirmed) {
        return { success: false, confirmationRequired: true, confirmationMessage: `Delete poll "${poll.title}"?`, message: "Please confirm deletion.", data: { pollId: poll.id } }
      }
      await prisma.meetingPoll.delete({ where: { id: poll.id } })
      return { success: true, message: `Deleted poll "${poll.title}".` }
    },
  },

  close_poll: {
    description: "Close voting on a poll and optionally pick the winning option",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Poll ID" },
        finalOptionId: { type: "string", description: "Winning option ID (optional, auto-picks most voted)" },
      },
      required: ["id"],
    },
    execute: async (params, userId) => {
      const poll = await prisma.meetingPoll.findFirst({
        where: { id: params.id as string, createdBy: userId },
        include: { options: { include: { votes: true } } },
      })
      if (!poll) return { success: false, message: "Poll not found." }
      if (poll.status !== "open") return { success: false, message: "Poll is already closed." }

      let finalOptionId = params.finalOptionId as string | undefined
      if (!finalOptionId) {
        const sorted = poll.options.map((o) => ({ id: o.id, yesCount: o.votes.filter((v) => v.availability === "yes").length })).sort((a, b) => b.yesCount - a.yesCount)
        finalOptionId = sorted[0]?.id
      }

      await prisma.meetingPoll.update({ where: { id: poll.id }, data: { status: "closed", finalOptionId } })
      return { success: true, message: `Closed poll "${poll.title}".`, data: { finalOptionId } }
    },
  },

  get_poll_results: {
    description: "Show votes/results for a meeting poll",
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "Poll ID" } },
      required: ["id"],
    },
    execute: async (params, userId) => {
      const poll = await prisma.meetingPoll.findFirst({
        where: { id: params.id as string, createdBy: userId },
        include: { options: { include: { votes: true } } },
      })
      if (!poll) return { success: false, message: "Poll not found." }
      const results = poll.options.map((o) => ({
        optionId: o.id, startTime: o.startTime.toISOString(), endTime: o.endTime.toISOString(),
        yes: o.votes.filter((v) => v.availability === "yes").length,
        maybe: o.votes.filter((v) => v.availability === "maybe").length,
        no: o.votes.filter((v) => v.availability === "no").length,
      }))
      return { success: true, message: `Results for "${poll.title}" (${poll.status}).`, data: { results, status: poll.status, finalOptionId: poll.finalOptionId } }
    },
  },

  // ── Routing Forms ────────────────────────────────────────────
  list_routing_forms: {
    description: "List routing forms",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const forms = await prisma.routingForm.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { fields: true, rules: true } } },
      })
      return {
        success: true,
        message: forms.length ? `Found ${forms.length} routing form(s).` : "No routing forms yet.",
        data: { forms: forms.map((f) => ({ id: f.id, title: f.title, fields: f._count.fields, rules: f._count.rules })) },
      }
    },
  },

  create_routing_form: {
    description: "Create a routing form with fields and rules",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        fields: { type: "array", items: { type: "object", properties: { label: { type: "string" }, type: { type: "string" }, required: { type: "boolean" }, options: { type: "string" }, order: { type: "number" } } } },
        rules: { type: "array", items: { type: "object", properties: { fieldId: { type: "string" }, operator: { type: "string" }, value: { type: "string" }, eventTypeId: { type: "string" }, order: { type: "number" } } } },
        fallbackEventTypeId: { type: "string" },
      },
      required: ["title", "fields"],
    },
    execute: async (params, userId) => {
      const fields = params.fields as Array<{ label: string; type: string; required?: boolean; options?: string; order?: number }>
      const form = await prisma.routingForm.create({
        data: {
          title: params.title as string,
          description: (params.description as string) || null,
          userId,
          fallbackEventTypeId: (params.fallbackEventTypeId as string) || null,
          fields: { create: fields.map((f, i) => ({ label: f.label, type: f.type, required: f.required !== false, options: f.options || null, order: f.order || i })) },
        },
      })
      return { success: true, message: `Created routing form "${form.title}" with ${fields.length} field(s).`, data: { formId: form.id } }
    },
  },

  delete_routing_form: {
    description: "Delete a routing form. Requires confirmation.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Routing form ID" },
        confirmed: { type: "boolean", description: "Must be true to delete" },
      },
      required: ["id"],
    },
    execute: async (params, userId) => {
      const form = await prisma.routingForm.findFirst({ where: { id: params.id as string, userId } })
      if (!form) return { success: false, message: "Routing form not found." }
      if (!params.confirmed) {
        return { success: false, confirmationRequired: true, confirmationMessage: `Delete routing form "${form.title}"?`, message: "Please confirm deletion.", data: { formId: form.id } }
      }
      await prisma.routingForm.delete({ where: { id: form.id } })
      return { success: true, message: `Deleted routing form "${form.title}".` }
    },
  },

  // ── Embed ────────────────────────────────────────────────────
  get_embed_code: {
    description: "Generate embed code for an event type (inline, popup, or floating button)",
    parameters: {
      type: "object",
      properties: {
        eventTypeId: { type: "string" },
        eventTypeTitle: { type: "string", description: "Find by title if ID not provided" },
        style: { type: "string", enum: ["inline", "popup", "floating"], description: "Embed style, defaults to inline" },
      },
      required: [],
    },
    execute: async (params, userId) => {
      let eventType
      if (params.eventTypeId) {
        eventType = await prisma.eventType.findFirst({ where: { id: params.eventTypeId as string, userId } })
      } else if (params.eventTypeTitle) {
        eventType = await prisma.eventType.findFirst({ where: { userId, title: { contains: params.eventTypeTitle as string, mode: "insensitive" } } })
      }
      if (!eventType) return { success: false, message: "Event type not found." }

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, customDomain: true, customDomainVerified: true } })
      const baseUrl = user?.customDomain && user.customDomainVerified ? `https://${user.customDomain}` : "https://letsmeet.link"
      const url = `${baseUrl}/${user?.username}/${eventType.slug}`
      const style = (params.style as string) || "inline"

      let code: string
      if (style === "inline") {
        code = `<iframe src="${url}?embed=true" style="width:100%;height:700px;border:none;" loading="lazy"></iframe>`
      } else if (style === "popup") {
        code = `<button onclick="window.open('${url}?embed=true','letsmeet','width=600,height=700')">Book a meeting</button>`
      } else {
        code = `<div style="position:fixed;bottom:20px;right:20px;z-index:9999"><button onclick="window.open('${url}?embed=true','letsmeet','width=600,height=700')" style="background:${eventType.color};color:white;border:none;padding:12px 24px;border-radius:24px;cursor:pointer;font-size:16px">📅 Book a meeting</button></div>`
      }

      return { success: true, message: `Here's your ${style} embed code:`, data: { code, url, style } }
    },
  },

  // ── Custom Domain ────────────────────────────────────────────
  get_custom_domain: {
    description: "Show current custom domain settings",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { customDomain: true, customDomainVerified: true } })
      if (!user?.customDomain) return { success: true, message: "No custom domain configured.", data: { customDomain: null } }
      return { success: true, message: `Custom domain: ${user.customDomain} (${user.customDomainVerified ? "verified ✅" : "not verified ❌"}).`, data: { customDomain: user.customDomain, verified: user.customDomainVerified } }
    },
  },

  set_custom_domain: {
    description: "Set or update custom domain",
    parameters: { type: "object", properties: { domain: { type: "string", description: "Domain name e.g. meet.example.com" } }, required: ["domain"] },
    execute: async (params, userId) => {
      const domain = (params.domain as string).toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "")
      await prisma.user.update({ where: { id: userId }, data: { customDomain: domain, customDomainVerified: false } })
      return { success: true, message: `Custom domain set to "${domain}". Add a CNAME record pointing to letsmeet.link, then verify.`, data: { domain, dnsRecord: { type: "CNAME", name: domain, value: "letsmeet.link" } } }
    },
  },

  verify_custom_domain: {
    description: "Check DNS verification for custom domain",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { customDomain: true, customDomainVerified: true } })
      if (!user?.customDomain) return { success: false, message: "No custom domain configured." }
      if (user.customDomainVerified) return { success: true, message: `Domain "${user.customDomain}" is already verified ✅.` }

      // Simple DNS check
      try {
        const { promises: dns } = require("dns")
        const records = await dns.resolveCname(user.customDomain)
        const isValid = records.some((r: string) => r.includes("letsmeet.link"))
        if (isValid) {
          await prisma.user.update({ where: { id: userId }, data: { customDomainVerified: true } })
          return { success: true, message: `Domain "${user.customDomain}" verified ✅!` }
        }
        return { success: false, message: `CNAME not found. Please add a CNAME record for "${user.customDomain}" pointing to "letsmeet.link".`, data: { records } }
      } catch {
        return { success: false, message: `DNS lookup failed for "${user.customDomain}". Make sure the CNAME record is set correctly.` }
      }
    },
  },

  // ── Holidays ─────────────────────────────────────────────────
  get_holidays: {
    description: "Show blocked holidays settings",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { blockHolidays: true, holidayCountry: true } })
      return { success: true, message: user?.blockHolidays ? `Holiday blocking enabled for ${user.holidayCountry || "no country set"}.` : "Holiday blocking is disabled.", data: { blockHolidays: user?.blockHolidays, holidayCountry: user?.holidayCountry } }
    },
  },

  set_holidays: {
    description: "Enable/disable holiday blocking and set country",
    parameters: {
      type: "object",
      properties: {
        blockHolidays: { type: "boolean" },
        holidayCountry: { type: "string", description: "ISO country code e.g. US, IL, GB" },
      },
      required: [],
    },
    execute: async (params, userId) => {
      const data: Record<string, unknown> = {}
      if (params.blockHolidays !== undefined) data.blockHolidays = params.blockHolidays
      if (params.holidayCountry !== undefined) data.holidayCountry = params.holidayCountry
      if (Object.keys(data).length === 0) return { success: false, message: "No changes specified." }
      await prisma.user.update({ where: { id: userId }, data })
      return { success: true, message: `Holiday settings updated.`, data }
    },
  },

  // ── Branding ─────────────────────────────────────────────────
  get_branding: {
    description: "Show current brand settings",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { brandColor: true, brandLogo: true, hidePoweredBy: true } })
      return { success: true, message: "Current branding settings.", data: { brandColor: user?.brandColor, brandLogo: user?.brandLogo, hidePoweredBy: user?.hidePoweredBy } }
    },
  },

  update_branding: {
    description: "Update brand color, logo URL, or hide powered-by badge",
    parameters: {
      type: "object",
      properties: {
        brandColor: { type: "string", description: "Hex color e.g. #3B82F6" },
        brandLogo: { type: "string", description: "Logo URL" },
        hidePoweredBy: { type: "boolean" },
      },
      required: [],
    },
    execute: async (params, userId) => {
      const data: Record<string, unknown> = {}
      if (params.brandColor !== undefined) data.brandColor = params.brandColor
      if (params.brandLogo !== undefined) data.brandLogo = params.brandLogo
      if (params.hidePoweredBy !== undefined) data.hidePoweredBy = params.hidePoweredBy
      if (Object.keys(data).length === 0) return { success: false, message: "No changes specified." }
      await prisma.user.update({ where: { id: userId }, data })
      return { success: true, message: `Branding updated: ${Object.keys(data).join(", ")}.` }
    },
  },

  // ── Linked Accounts ──────────────────────────────────────────
  list_linked_accounts: {
    description: "Show linked Google/OAuth accounts",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const accounts = await prisma.account.findMany({
        where: { userId },
        select: { provider: true, providerAccountId: true, type: true },
      })
      return {
        success: true,
        message: accounts.length ? `Found ${accounts.length} linked account(s).` : "No linked accounts.",
        data: { accounts },
      }
    },
  },

  get_calendars: {
    description: "Show calendar sync status",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarSyncEnabled: true } })
      const accounts = await prisma.account.findMany({ where: { userId, provider: "google" }, select: { providerAccountId: true } })
      return {
        success: true,
        message: `Calendar sync: ${user?.calendarSyncEnabled ? "enabled" : "disabled"}. ${accounts.length} Google account(s) linked.`,
        data: { calendarSyncEnabled: user?.calendarSyncEnabled, googleAccounts: accounts.length },
      }
    },
  },

  // ── API Keys ─────────────────────────────────────────────────
  list_api_keys: {
    description: "Show API keys",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const keys = await prisma.apiKey.findMany({
        where: { userId, revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, keyPrefix: true, name: true, createdAt: true, lastUsedAt: true },
      })
      return {
        success: true,
        message: keys.length ? `Found ${keys.length} active API key(s).` : "No API keys.",
        data: { apiKeys: keys },
      }
    },
  },

  create_api_key: {
    description: "Generate a new API key",
    parameters: {
      type: "object",
      properties: { name: { type: "string", description: "Key name/label" } },
      required: ["name"],
    },
    execute: async (params, userId) => {
      const crypto = require("crypto")
      const rawKey = `mk_${crypto.randomBytes(32).toString("hex")}`
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex")
      const keyPrefix = rawKey.slice(0, 11)

      await prisma.apiKey.create({
        data: { keyHash, keyPrefix, name: params.name as string, userId },
      })

      return { success: true, message: `API key created: ${rawKey}\n\n⚠️ Save this now — it won't be shown again!`, data: { key: rawKey, keyPrefix } }
    },
  },

  delete_api_key: {
    description: "Revoke an API key. Requires confirmation.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "API key ID" },
        confirmed: { type: "boolean" },
      },
      required: ["id"],
    },
    execute: async (params, userId) => {
      const key = await prisma.apiKey.findFirst({ where: { id: params.id as string, userId, revokedAt: null } })
      if (!key) return { success: false, message: "API key not found." }
      if (!params.confirmed) {
        return { success: false, confirmationRequired: true, confirmationMessage: `Revoke API key "${key.name}" (${key.keyPrefix}...)?`, message: "Please confirm revocation.", data: { keyId: key.id } }
      }
      await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } })
      return { success: true, message: `Revoked API key "${key.name}".` }
    },
  },

  // ── Webhooks ─────────────────────────────────────────────────
  list_webhooks: {
    description: "Show configured webhooks",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const webhooks = await prisma.webhook.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { deliveries: true } } },
      })
      return {
        success: true,
        message: webhooks.length ? `Found ${webhooks.length} webhook(s).` : "No webhooks configured.",
        data: { webhooks: webhooks.map((w) => ({ id: w.id, url: w.url, events: w.events, active: w.active, deliveries: w._count.deliveries })) },
      }
    },
  },

  create_webhook: {
    description: "Create a webhook with URL and events to listen for",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Webhook endpoint URL" },
        events: { type: "array", items: { type: "string" }, description: "Events: booking.created, booking.cancelled, booking.rescheduled" },
      },
      required: ["url", "events"],
    },
    execute: async (params, userId) => {
      const crypto = require("crypto")
      const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`
      const webhook = await prisma.webhook.create({
        data: { userId, url: params.url as string, events: params.events as string[], secret, active: true },
      })
      return { success: true, message: `Webhook created. Secret: ${secret}\n\n⚠️ Save this secret now!`, data: { webhookId: webhook.id, secret } }
    },
  },

  delete_webhook: {
    description: "Delete a webhook. Requires confirmation.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Webhook ID" },
        confirmed: { type: "boolean" },
      },
      required: ["id"],
    },
    execute: async (params, userId) => {
      const webhook = await prisma.webhook.findFirst({ where: { id: params.id as string, userId } })
      if (!webhook) return { success: false, message: "Webhook not found." }
      if (!params.confirmed) {
        return { success: false, confirmationRequired: true, confirmationMessage: `Delete webhook for "${webhook.url}"?`, message: "Please confirm deletion.", data: { webhookId: webhook.id } }
      }
      await prisma.webhook.delete({ where: { id: webhook.id } })
      return { success: true, message: `Deleted webhook for "${webhook.url}".` }
    },
  },

  test_webhook: {
    description: "Trigger a test delivery for a webhook",
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "Webhook ID" } },
      required: ["id"],
    },
    execute: async (params, userId) => {
      const webhook = await prisma.webhook.findFirst({ where: { id: params.id as string, userId } })
      if (!webhook) return { success: false, message: "Webhook not found." }

      const testPayload = { event: "test", timestamp: new Date().toISOString(), data: { message: "This is a test delivery from letsmeet.link" } }
      try {
        const crypto = require("crypto")
        const signature = crypto.createHmac("sha256", webhook.secret).update(JSON.stringify(testPayload)).digest("hex")
        const res = await fetch(webhook.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Webhook-Signature": signature },
          body: JSON.stringify(testPayload),
        })
        await prisma.webhookDelivery.create({
          data: { webhookId: webhook.id, event: "test", payload: testPayload, status: res.ok ? "SUCCESS" : "FAILED", responseCode: res.status, attempts: 1 },
        })
        return { success: true, message: `Test delivery sent. Response: ${res.status} ${res.statusText}` }
      } catch (err) {
        return { success: false, message: `Test delivery failed: ${err instanceof Error ? err.message : "Network error"}` }
      }
    },
  },

  // ── Recurring Meetings ───────────────────────────────────────
  list_recurring_bookings: {
    description: "Show recurring booking series",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params, userId) => {
      const parents = await prisma.booking.findMany({
        where: { hostId: userId, recurrenceRule: { not: null }, recurrenceParentId: null },
        orderBy: { startTime: "desc" },
        include: { eventType: { select: { title: true } }, _count: { select: { recurrenceChildren: true } } },
      })
      return {
        success: true,
        message: parents.length ? `Found ${parents.length} recurring series.` : "No recurring bookings.",
        data: {
          series: parents.map((b) => ({
            id: b.id, eventType: b.eventType.title, guestName: b.guestName, guestEmail: b.guestEmail,
            recurrenceRule: b.recurrenceRule, occurrences: b._count.recurrenceChildren + 1, status: b.status,
            startTime: b.startTime.toISOString(),
          })),
        },
      }
    },
  },

  cancel_recurring_series: {
    description: "Cancel an entire recurring series. Requires confirmation.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Parent booking ID of the series" },
        confirmed: { type: "boolean" },
      },
      required: ["id"],
    },
    execute: async (params, userId) => {
      const parent = await prisma.booking.findFirst({
        where: { id: params.id as string, hostId: userId, recurrenceParentId: null },
        include: { eventType: { select: { title: true } }, _count: { select: { recurrenceChildren: true } } },
      })
      if (!parent) return { success: false, message: "Recurring series not found." }
      if (!params.confirmed) {
        const count = parent._count.recurrenceChildren + 1
        return { success: false, confirmationRequired: true, confirmationMessage: `Cancel all ${count} bookings in "${parent.eventType.title}" series with ${parent.guestName}?`, message: "Please confirm.", data: { bookingId: parent.id, count } }
      }
      await prisma.booking.updateMany({ where: { recurrenceParentId: parent.id }, data: { status: "CANCELLED" } })
      await prisma.booking.update({ where: { id: parent.id }, data: { status: "CANCELLED" } })
      return { success: true, message: `Cancelled entire recurring series.` }
    },
  },

  // ── Group Events ─────────────────────────────────────────────
  get_group_event_status: {
    description: "Show attendees for group event time slots",
    parameters: {
      type: "object",
      properties: {
        eventTypeId: { type: "string" },
        eventTypeTitle: { type: "string" },
      },
      required: [],
    },
    execute: async (params, userId) => {
      let eventType
      if (params.eventTypeId) {
        eventType = await prisma.eventType.findFirst({ where: { id: params.eventTypeId as string, userId, maxAttendees: { gt: 1 } } })
      } else if (params.eventTypeTitle) {
        eventType = await prisma.eventType.findFirst({ where: { userId, title: { contains: params.eventTypeTitle as string, mode: "insensitive" }, maxAttendees: { gt: 1 } } })
      } else {
        eventType = await prisma.eventType.findFirst({ where: { userId, maxAttendees: { gt: 1 } } })
      }
      if (!eventType) return { success: false, message: "No group event type found." }

      const bookings = await prisma.booking.findMany({
        where: { eventTypeId: eventType.id, status: { in: ["CONFIRMED", "PENDING"] }, startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        select: { startTime: true, endTime: true, guestName: true, guestEmail: true, status: true },
      })

      // Group by time slot
      const slots: Record<string, Array<{ name: string; email: string }>> = {}
      for (const b of bookings) {
        const key = b.startTime.toISOString()
        if (!slots[key]) slots[key] = []
        slots[key].push({ name: b.guestName, email: b.guestEmail })
      }

      return {
        success: true,
        message: `Group event "${eventType.title}" (max ${eventType.maxAttendees}/slot).`,
        data: { eventType: eventType.title, maxAttendees: eventType.maxAttendees, slots },
      }
    },
  },

  // ── Custom Questions ─────────────────────────────────────────
  get_event_questions: {
    description: "Show custom booking questions for an event type",
    parameters: {
      type: "object",
      properties: {
        eventTypeId: { type: "string" },
        eventTypeTitle: { type: "string" },
      },
      required: [],
    },
    execute: async (params, userId) => {
      let eventType
      if (params.eventTypeId) {
        eventType = await prisma.eventType.findFirst({ where: { id: params.eventTypeId as string, userId }, select: { id: true, title: true, customQuestions: true } })
      } else if (params.eventTypeTitle) {
        eventType = await prisma.eventType.findFirst({ where: { userId, title: { contains: params.eventTypeTitle as string, mode: "insensitive" } }, select: { id: true, title: true, customQuestions: true } })
      }
      if (!eventType) return { success: false, message: "Event type not found." }
      const questions = eventType.customQuestions ? JSON.parse(eventType.customQuestions) : []
      return { success: true, message: questions.length ? `${questions.length} custom question(s) on "${eventType.title}".` : `No custom questions on "${eventType.title}".`, data: { eventTypeId: eventType.id, questions } }
    },
  },

  set_event_questions: {
    description: "Add/update custom booking questions on an event type",
    parameters: {
      type: "object",
      properties: {
        eventTypeId: { type: "string" },
        eventTypeTitle: { type: "string" },
        questions: {
          type: "array",
          items: { type: "object", properties: { id: { type: "string" }, label: { type: "string" }, type: { type: "string", enum: ["text", "textarea", "select", "checkbox", "radio"] }, required: { type: "boolean" }, options: { type: "array", items: { type: "string" } } } },
          description: "Array of question definitions",
        },
      },
      required: ["questions"],
    },
    execute: async (params, userId) => {
      let eventType
      if (params.eventTypeId) {
        eventType = await prisma.eventType.findFirst({ where: { id: params.eventTypeId as string, userId } })
      } else if (params.eventTypeTitle) {
        eventType = await prisma.eventType.findFirst({ where: { userId, title: { contains: params.eventTypeTitle as string, mode: "insensitive" } } })
      }
      if (!eventType) return { success: false, message: "Event type not found." }

      const questions = (params.questions as Array<Record<string, unknown>>).map((q, i) => ({
        id: q.id || `q_${Date.now()}_${i}`,
        label: q.label,
        type: q.type || "text",
        required: q.required !== false,
        options: q.options || undefined,
      }))

      await prisma.eventType.update({ where: { id: eventType.id }, data: { customQuestions: JSON.stringify(questions) } })
      return { success: true, message: `Set ${questions.length} custom question(s) on "${eventType.title}".`, data: { questions } }
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

  // ── Info-only actions for new features ──

  get_audit_logs: {
    description: "View audit logs",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params: Record<string, unknown>, _userId: string) => {
      return { success: true, message: "📋 View your audit log at [Settings → Audit Log](/dashboard/settings/audit-log). It tracks all actions like event type changes, bookings, and team updates." }
    },
  },

  get_sso_info: {
    description: "Get SSO/SAML setup info",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params: Record<string, unknown>, _userId: string) => {
      return { success: true, message: "🔐 SSO/SAML is available on the Enterprise plan. Configure it in your [Team Settings](/dashboard/teams) → SSO tab. Supports Okta, Azure AD, and Google Workspace." }
    },
  },

  get_scim_info: {
    description: "Get SCIM provisioning info",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params: Record<string, unknown>, _userId: string) => {
      return { success: true, message: "👥 SCIM 2.0 provisioning is available on the Enterprise plan. Set it up in your [Team Settings](/dashboard/teams) → SCIM tab. Auto-sync users from Okta, Azure AD, or OneLogin." }
    },
  },

  list_sequences: {
    description: "List email sequences",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params: Record<string, unknown>, _userId: string) => {
      return { success: true, message: "📧 Manage your email outreach sequences at [Workflows](/dashboard/workflows). Create automated follow-up sequences for after bookings." }
    },
  },

  create_sequence: {
    description: "Create email sequence",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params: Record<string, unknown>, _userId: string) => {
      return { success: true, message: "📧 Create email sequences at [Workflows → New](/dashboard/workflows). Add steps with delays and customize email templates." }
    },
  },

  get_pwa_info: {
    description: "Get PWA install info",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params: Record<string, unknown>, _userId: string) => {
      return { success: true, message: "📱 letsmeet.link is installable as an app! On your phone or desktop, look for the \"Install\" or \"Add to Home Screen\" prompt in your browser. Works offline too." }
    },
  },

  get_extension_info: {
    description: "Get Chrome extension info",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (_params: Record<string, unknown>, _userId: string) => {
      return { success: true, message: "🧩 Our Chrome extension lets you schedule meetings directly from Gmail and LinkedIn. Install it from the browser-extension folder or check [our docs](/about) for details." }
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
