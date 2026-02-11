import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { ensureDefaultWorkflows } from "@/lib/workflows"
import { z } from "zod"

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: z.enum(["BOOKING_CREATED", "BOOKING_CANCELLED", "BOOKING_RESCHEDULED", "BEFORE_MEETING", "AFTER_MEETING"]),
  isActive: z.boolean().optional().default(true),
  steps: z.array(z.object({
    order: z.number().int().min(1),
    action: z.enum(["SEND_EMAIL", "SEND_WEBHOOK", "WAIT"]),
    delay: z.number().int().min(0).default(0),
    config: z.record(z.unknown()),
  })).min(1),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure default workflows exist on first access
  await ensureDefaultWorkflows(session.user.id)

  const workflows = await prisma.workflow.findMany({
    where: { userId: session.user.id },
    include: {
      steps: { orderBy: { order: "asc" } },
      _count: { select: { executions: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(workflows)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createWorkflowSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { name, trigger, isActive, steps } = parsed.data

  const workflow = await prisma.workflow.create({
    data: {
      userId: session.user.id,
      name,
      trigger,
      isActive,
      steps: {
        create: steps.map((s) => ({
          order: s.order,
          action: s.action,
          delay: s.delay,
          config: s.config,
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json(workflow, { status: 201 })
}
