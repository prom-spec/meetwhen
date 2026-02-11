import prisma from "@/lib/prisma"
import { formatInTimeZone } from "date-fns-tz"
import type { WorkflowTrigger, WorkflowAction } from "@prisma/client"

// ── Template variable resolution ──

interface TemplateContext {
  guest_name: string
  host_name: string
  event_title: string
  meeting_time: string
  meeting_url: string
  booking_url: string
}

function resolveTemplate(template: string, ctx: TemplateContext): string {
  return template
    .replace(/\{\{guest_name\}\}/g, ctx.guest_name)
    .replace(/\{\{host_name\}\}/g, ctx.host_name)
    .replace(/\{\{event_title\}\}/g, ctx.event_title)
    .replace(/\{\{meeting_time\}\}/g, ctx.meeting_time)
    .replace(/\{\{meeting_url\}\}/g, ctx.meeting_url)
    .replace(/\{\{booking_url\}\}/g, ctx.booking_url)
}

async function buildTemplateContext(bookingId: string): Promise<TemplateContext | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      eventType: { select: { title: true } },
      host: { select: { name: true, email: true, timezone: true } },
    },
  })
  if (!booking) return null

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const tz = booking.guestTimezone || "UTC"

  return {
    guest_name: booking.guestName,
    host_name: booking.host.name || "Host",
    event_title: booking.eventType.title,
    meeting_time: formatInTimeZone(booking.startTime, tz, "EEEE, MMMM d, yyyy 'at' h:mm a"),
    meeting_url: booking.meetingUrl || "",
    booking_url: `${baseUrl}/booking/${booking.id}`,
  }
}

// ── Step executors ──

async function executeSendEmail(
  config: Record<string, unknown>,
  ctx: TemplateContext
): Promise<void> {
  const subject = resolveTemplate((config.subject as string) || "", ctx)
  const body = resolveTemplate((config.body as string) || "", ctx)
  const to = resolveTemplate((config.to as string) || "{{guest_email}}", ctx)

  // Use Resend directly for workflow emails (plain text body)
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY not set")

  const { Resend } = await import("resend")
  const resend = new Resend(key)
  const from = process.env.EMAIL_FROM || "letsmeet.link <onboarding@resend.dev>"

  // Determine recipient: if config has 'to' field use it, else guest email
  // We need guest email from the booking - get it from context workaround
  // For now, workflow emails go to the guest by default
  const bookingForEmail = config._bookingEmail as string | undefined

  await resend.emails.send({
    from,
    to: bookingForEmail || to || ctx.guest_name, // fallback
    subject,
    html: body.replace(/\n/g, "<br>"),
  })
}

async function executeSendWebhook(
  config: Record<string, unknown>,
  ctx: TemplateContext
): Promise<void> {
  const url = resolveTemplate((config.url as string) || "", ctx)
  const method = ((config.method as string) || "POST").toUpperCase()

  const payload = JSON.stringify({
    guest_name: ctx.guest_name,
    host_name: ctx.host_name,
    event_title: ctx.event_title,
    meeting_time: ctx.meeting_time,
    meeting_url: ctx.meeting_url,
    booking_url: ctx.booking_url,
  })

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.headers as Record<string, string> || {}),
  }

  const res = await fetch(url, { method, headers, body: payload })
  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status}: ${await res.text().catch(() => "")}`)
  }
}

// ── Main workflow execution ──

export async function executeWorkflow(
  trigger: WorkflowTrigger,
  bookingId: string
): Promise<void> {
  // Get the booking to find the host (workflow owner)
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { hostId: true, guestEmail: true },
  })
  if (!booking) return

  // Find all active workflows for this user+trigger
  const workflows = await prisma.workflow.findMany({
    where: {
      userId: booking.hostId,
      trigger,
      isActive: true,
    },
    include: {
      steps: { orderBy: { order: "asc" } },
    },
  })

  if (workflows.length === 0) return

  const now = new Date()

  for (const workflow of workflows) {
    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        bookingId,
        status: "RUNNING",
        stepRuns: {
          create: workflow.steps.map((step, idx) => {
            // Calculate cumulative delay
            const cumulativeDelay = workflow.steps
              .slice(0, idx + 1)
              .reduce((sum, s) => sum + s.delay, 0)

            return {
              stepOrder: step.order,
              action: step.action,
              status: "PENDING" as const,
              scheduledAt: new Date(now.getTime() + cumulativeDelay * 60 * 1000),
            }
          }),
        },
      },
    })

    // Execute immediate steps (delay = 0 cumulative)
    await processExecutionSteps(execution.id, bookingId, booking.guestEmail)
  }
}

/**
 * Process pending step runs that are due. Called both inline and from cron.
 */
export async function processExecutionSteps(
  executionId: string,
  bookingId?: string,
  guestEmail?: string
): Promise<void> {
  const now = new Date()

  const pendingRuns = await prisma.workflowStepRun.findMany({
    where: {
      executionId,
      status: "PENDING",
      scheduledAt: { lte: now },
    },
    orderBy: { stepOrder: "asc" },
    include: {
      execution: {
        include: {
          workflow: {
            include: { steps: true },
          },
        },
      },
    },
  })

  if (pendingRuns.length === 0) return

  const bId = bookingId || pendingRuns[0].execution.bookingId
  const ctx = await buildTemplateContext(bId)
  if (!ctx) {
    // Booking deleted? Mark all as failed
    await prisma.workflowStepRun.updateMany({
      where: { executionId, status: "PENDING" },
      data: { status: "FAILED", error: "Booking not found" },
    })
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "FAILED", error: "Booking not found" },
    })
    return
  }

  // Get guest email if not provided
  if (!guestEmail) {
    const b = await prisma.booking.findUnique({ where: { id: bId }, select: { guestEmail: true } })
    guestEmail = b?.guestEmail
  }

  for (const run of pendingRuns) {
    const step = run.execution.workflow.steps.find((s) => s.order === run.stepOrder)
    if (!step) {
      await prisma.workflowStepRun.update({
        where: { id: run.id },
        data: { status: "SKIPPED", executedAt: now },
      })
      continue
    }

    if (step.action === "WAIT") {
      // WAIT steps are just delays — mark complete
      await prisma.workflowStepRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", executedAt: now },
      })
      continue
    }

    try {
      await prisma.workflowStepRun.update({
        where: { id: run.id },
        data: { status: "RUNNING" },
      })

      const config = step.config as Record<string, unknown>
      // Inject guest email into config for email sending
      if (guestEmail) config._bookingEmail = guestEmail

      if (step.action === "SEND_EMAIL") {
        await executeSendEmail(config, ctx)
      } else if (step.action === "SEND_WEBHOOK") {
        await executeSendWebhook(config, ctx)
      }

      await prisma.workflowStepRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", executedAt: new Date() },
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      await prisma.workflowStepRun.update({
        where: { id: run.id },
        data: { status: "FAILED", executedAt: new Date(), error: errMsg },
      })
    }
  }

  // Check if execution is complete
  const remaining = await prisma.workflowStepRun.count({
    where: { executionId, status: { in: ["PENDING", "RUNNING"] } },
  })

  if (remaining === 0) {
    const failed = await prisma.workflowStepRun.count({
      where: { executionId, status: "FAILED" },
    })
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: failed > 0 ? "FAILED" : "COMPLETED" },
    })
  }
}

/**
 * Process all pending workflow step runs (called by cron).
 * Handles delayed steps and BEFORE_MEETING/AFTER_MEETING triggers.
 */
export async function processPendingWorkflowSteps(): Promise<{ processed: number }> {
  const now = new Date()

  // Find all pending step runs that are due
  const pendingRuns = await prisma.workflowStepRun.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lte: now },
    },
    select: { executionId: true },
    distinct: ["executionId"],
    take: 100,
  })

  let processed = 0
  for (const { executionId } of pendingRuns) {
    await processExecutionSteps(executionId)
    processed++
  }

  return { processed }
}

/**
 * Check for BEFORE_MEETING triggers (bookings starting within configured windows).
 * Called by cron. Creates executions for matching workflows.
 */
export async function processBeforeMeetingTriggers(): Promise<{ triggered: number }> {
  const now = new Date()
  // Look for bookings starting in the next 25 hours (covers 24h reminder window)
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // Get all active BEFORE_MEETING workflows
  const workflows = await prisma.workflow.findMany({
    where: { trigger: "BEFORE_MEETING", isActive: true },
    include: { steps: { orderBy: { order: "asc" } } },
  })

  if (workflows.length === 0) return { triggered: 0 }

  let triggered = 0

  for (const workflow of workflows) {
    // The first step's delay defines "how long before meeting" to trigger
    const triggerMinutesBefore = workflow.steps.reduce((sum, s) => sum + s.delay, 0)
    // We want to trigger when: now + triggerMinutesBefore ≈ meeting startTime
    // More precisely: find bookings where startTime is between now and now + triggerMinutesBefore + buffer
    
    const bookings = await prisma.booking.findMany({
      where: {
        hostId: workflow.userId,
        status: "CONFIRMED",
        startTime: { gte: now, lte: windowEnd },
      },
      select: { id: true },
    })

    for (const booking of bookings) {
      // Check if we already have an execution for this workflow+booking
      const existing = await prisma.workflowExecution.findFirst({
        where: { workflowId: workflow.id, bookingId: booking.id },
      })
      if (existing) continue

      await executeWorkflowDirect(workflow, booking.id)
      triggered++
    }
  }

  return { triggered }
}

/**
 * Check for AFTER_MEETING triggers.
 */
export async function processAfterMeetingTriggers(): Promise<{ triggered: number }> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2h ago

  const workflows = await prisma.workflow.findMany({
    where: { trigger: "AFTER_MEETING", isActive: true },
    include: { steps: { orderBy: { order: "asc" } } },
  })

  if (workflows.length === 0) return { triggered: 0 }

  let triggered = 0

  for (const workflow of workflows) {
    const bookings = await prisma.booking.findMany({
      where: {
        hostId: workflow.userId,
        status: "CONFIRMED",
        endTime: { gte: windowStart, lte: now },
      },
      select: { id: true },
    })

    for (const booking of bookings) {
      const existing = await prisma.workflowExecution.findFirst({
        where: { workflowId: workflow.id, bookingId: booking.id },
      })
      if (existing) continue

      await executeWorkflowDirect(workflow, booking.id)
      triggered++
    }
  }

  return { triggered }
}

// Helper: execute a specific workflow with its steps already loaded
async function executeWorkflowDirect(
  workflow: { id: string; steps: { order: number; action: WorkflowAction; delay: number }[] },
  bookingId: string
): Promise<void> {
  const now = new Date()
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { guestEmail: true } })

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      bookingId,
      status: "RUNNING",
      stepRuns: {
        create: workflow.steps.map((step, idx) => {
          const cumulativeDelay = workflow.steps.slice(0, idx + 1).reduce((sum, s) => sum + s.delay, 0)
          return {
            stepOrder: step.order,
            action: step.action,
            status: "PENDING" as const,
            scheduledAt: new Date(now.getTime() + cumulativeDelay * 60 * 1000),
          }
        }),
      },
    },
  })

  await processExecutionSteps(execution.id, bookingId, booking?.guestEmail || undefined)
}

// ── Default workflows ──

export async function ensureDefaultWorkflows(userId: string): Promise<void> {
  const existing = await prisma.workflow.count({ where: { userId } })
  if (existing > 0) return

  // 1. Booking confirmation email (on BOOKING_CREATED)
  await prisma.workflow.create({
    data: {
      userId,
      name: "Booking Confirmation Email",
      isActive: true,
      trigger: "BOOKING_CREATED",
      steps: {
        create: [
          {
            order: 1,
            action: "SEND_EMAIL",
            delay: 0,
            config: {
              subject: "Booking Confirmed: {{event_title}} with {{host_name}}",
              body: "Hi {{guest_name}},\n\nYour booking has been confirmed!\n\n📅 {{event_title}}\n🕐 {{meeting_time}}\n🔗 Meeting: {{meeting_url}}\n\nManage your booking: {{booking_url}}\n\nSee you there!",
            },
          },
        ],
      },
    },
  })

  // 2. Cancellation email
  await prisma.workflow.create({
    data: {
      userId,
      name: "Booking Cancellation Email",
      isActive: true,
      trigger: "BOOKING_CANCELLED",
      steps: {
        create: [
          {
            order: 1,
            action: "SEND_EMAIL",
            delay: 0,
            config: {
              subject: "Cancelled: {{event_title}} with {{host_name}}",
              body: "Hi {{guest_name}},\n\nYour booking for {{event_title}} on {{meeting_time}} has been cancelled.\n\nIf you'd like to reschedule, please book a new time.",
            },
          },
        ],
      },
    },
  })

  // 3. Reschedule email
  await prisma.workflow.create({
    data: {
      userId,
      name: "Booking Rescheduled Email",
      isActive: true,
      trigger: "BOOKING_RESCHEDULED",
      steps: {
        create: [
          {
            order: 1,
            action: "SEND_EMAIL",
            delay: 0,
            config: {
              subject: "Rescheduled: {{event_title}} with {{host_name}}",
              body: "Hi {{guest_name}},\n\nYour booking has been rescheduled.\n\n📅 {{event_title}}\n🕐 New time: {{meeting_time}}\n🔗 Meeting: {{meeting_url}}\n\nManage your booking: {{booking_url}}",
            },
          },
        ],
      },
    },
  })

  // 4. Reminder (24h before meeting)
  await prisma.workflow.create({
    data: {
      userId,
      name: "24h Meeting Reminder",
      isActive: true,
      trigger: "BEFORE_MEETING",
      steps: {
        create: [
          {
            order: 1,
            action: "SEND_EMAIL",
            delay: 0, // executes when BEFORE_MEETING fires (cron checks 24h window)
            config: {
              subject: "Reminder: {{event_title}} tomorrow",
              body: "Hi {{guest_name}},\n\nThis is a reminder that your meeting with {{host_name}} is coming up!\n\n📅 {{event_title}}\n🕐 {{meeting_time}}\n🔗 Meeting: {{meeting_url}}\n\nSee you soon!",
            },
          },
        ],
      },
    },
  })

  // 5. Post-meeting follow-up (30 min after)
  await prisma.workflow.create({
    data: {
      userId,
      name: "Post-Meeting Follow-up",
      isActive: true,
      trigger: "AFTER_MEETING",
      steps: {
        create: [
          {
            order: 1,
            action: "SEND_EMAIL",
            delay: 30, // 30 minutes after meeting ends
            config: {
              subject: "Hope your meeting with {{host_name}} went well! 👋",
              body: "Hi {{guest_name}},\n\nHope your meeting with {{host_name}} went well!\n\nIf you'd like to schedule another meeting, feel free to book again.\n\nHave a great day!",
            },
          },
        ],
      },
    },
  })
}
