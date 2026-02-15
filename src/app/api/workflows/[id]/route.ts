import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { z } from "zod"
import { apiLogger } from "@/lib/logger"

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  trigger: z.enum(["BOOKING_CREATED", "BOOKING_CANCELLED", "BOOKING_RESCHEDULED", "BEFORE_MEETING", "AFTER_MEETING"]).optional(),
  isActive: z.boolean().optional(),
  steps: z.array(z.object({
    order: z.number().int().min(1),
    action: z.enum(["SEND_EMAIL", "SEND_WEBHOOK", "WAIT"]),
    delay: z.number().int().min(0).default(0),
    config: z.record(z.unknown()),
  })).optional(),
})

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const workflow = await prisma.workflow.findFirst({
    where: { id, userId: session.user.id },
    include: {
      steps: { orderBy: { order: "asc" } },
      executions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { stepRuns: { orderBy: { stepOrder: "asc" } } },
      },
    },
  })

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
  }

  return NextResponse.json(workflow)
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.workflow.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = updateWorkflowSchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors; const firstField = Object.keys(fieldErrors)[0]; const firstMsg = firstField ? `${firstField}: ${fieldErrors[firstField]?.[0]}` : "Invalid input"; return NextResponse.json({ error: firstMsg, details: fieldErrors }, { status: 400 })
  }

  const { name, trigger, isActive, steps } = parsed.data

  // Update workflow and replace steps if provided
  const workflow = await prisma.workflow.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(trigger !== undefined && { trigger }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { steps: { orderBy: { order: "asc" } } },
  })

  if (steps) {
    // Delete old steps and create new ones
    await prisma.workflowStep.deleteMany({ where: { workflowId: id } })
    await prisma.workflowStep.createMany({
      data: steps.map((s) => ({
        workflowId: id,
        order: s.order,
        action: s.action,
        delay: s.delay,
        config: s.config,
      })),
    })
  }

  const updated = await prisma.workflow.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } } },
  })

  logAudit(session.user.id, "workflow.updated", "workflow", id, { name, trigger, isActive })

  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.workflow.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
  }

  await prisma.workflow.delete({ where: { id } })

  logAudit(session.user.id, "workflow.deleted", "workflow", id, { name: existing.name })

  return NextResponse.json({ success: true })
}
