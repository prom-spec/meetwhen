import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { apiLogger } from "@/lib/logger"

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  fallbackEventTypeId: z.string().optional(),
  fields: z.array(z.object({
    label: z.string().min(1),
    type: z.enum(["select", "text", "email", "phone", "textarea"]),
    required: z.boolean().optional(),
    options: z.string().optional(),
    order: z.number().int().min(0).optional(),
  })).optional(),
  rules: z.array(z.object({
    fieldId: z.string().optional(), // temp reference for new fields
    fieldIndex: z.number().int().min(0).optional(), // index into fields array
    operator: z.enum(["equals", "contains", "any"]),
    value: z.string(),
    eventTypeId: z.string(),
    order: z.number().int().min(0).optional(),
  })).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const forms = await prisma.routingForm.findMany({
    where: { userId: session.user.id },
    include: { fields: { orderBy: { order: "asc" } }, rules: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(forms)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Plan gating
  const { getPlanFromUser, canAccess } = await import("@/lib/plans")
  const planUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } })
  if (!canAccess(getPlanFromUser(planUser || {}), "routing")) {
    return NextResponse.json({ error: "Routing forms require a Pro plan. Upgrade at /dashboard/billing" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { title, description, fallbackEventTypeId, fields, rules } = parsed.data

  const form = await prisma.routingForm.create({
    data: {
      title,
      description,
      fallbackEventTypeId,
      userId: session.user.id,
      fields: fields ? {
        create: fields.map((f, i) => ({
          label: f.label,
          type: f.type,
          required: f.required ?? true,
          options: f.options,
          order: f.order ?? i,
        })),
      } : undefined,
    },
    include: { fields: { orderBy: { order: "asc" } } },
  })

  // Create rules with actual field IDs
  if (rules && rules.length > 0) {
    const ruleData = rules.map((r, i) => {
      let fieldId = r.fieldId || ""
      if (r.fieldIndex !== undefined && form.fields[r.fieldIndex]) {
        fieldId = form.fields[r.fieldIndex].id
      }
      return {
        formId: form.id,
        fieldId,
        operator: r.operator,
        value: r.value,
        eventTypeId: r.eventTypeId,
        order: r.order ?? i,
      }
    })
    await prisma.routingRule.createMany({ data: ruleData })
  }

  const result = await prisma.routingForm.findUnique({
    where: { id: form.id },
    include: { fields: { orderBy: { order: "asc" } }, rules: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json(result, { status: 201 })
}
