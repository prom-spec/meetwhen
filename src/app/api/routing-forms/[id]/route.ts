import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { apiLogger } from "@/lib/logger"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const form = await prisma.routingForm.findFirst({
    where: { id, userId: session.user.id },
    include: { fields: { orderBy: { order: "asc" } }, rules: { orderBy: { order: "asc" } } },
  })

  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(form)
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  fallbackEventTypeId: z.string().optional().nullable(),
  fields: z.array(z.object({
    id: z.string().optional(),
    label: z.string().min(1),
    type: z.enum(["select", "text", "email", "phone", "textarea"]),
    required: z.boolean().optional(),
    options: z.string().optional().nullable(),
    order: z.number().int().min(0).optional(),
  })).optional(),
  rules: z.array(z.object({
    id: z.string().optional(),
    fieldId: z.string(),
    operator: z.enum(["equals", "contains", "any"]),
    value: z.string(),
    eventTypeId: z.string(),
    order: z.number().int().min(0).optional(),
  })).optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.routingForm.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { title, description, fallbackEventTypeId, fields, rules } = parsed.data

  // Update form basics
  await prisma.routingForm.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(fallbackEventTypeId !== undefined && { fallbackEventTypeId }),
    },
  })

  // Replace fields if provided
  if (fields) {
    await prisma.routingFormField.deleteMany({ where: { formId: id } })
    await prisma.routingFormField.createMany({
      data: fields.map((f, i) => ({
        id: f.id || undefined,
        formId: id,
        label: f.label,
        type: f.type,
        required: f.required ?? true,
        options: f.options ?? null,
        order: f.order ?? i,
      })),
    })
  }

  // Replace rules if provided
  if (rules) {
    await prisma.routingRule.deleteMany({ where: { formId: id } })
    await prisma.routingRule.createMany({
      data: rules.map((r, i) => ({
        formId: id,
        fieldId: r.fieldId,
        operator: r.operator,
        value: r.value,
        eventTypeId: r.eventTypeId,
        order: r.order ?? i,
      })),
    })
  }

  const result = await prisma.routingForm.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } }, rules: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json(result)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.routingForm.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.routingForm.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
