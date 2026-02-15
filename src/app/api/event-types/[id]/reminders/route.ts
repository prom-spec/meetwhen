// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { apiLogger } from "@/lib/logger"

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const templates = await prisma.reminderTemplate.findMany({
    where: { eventTypeId: id, userId: session.user.id },
    orderBy: { offsetMinutes: "asc" },
  })

  return NextResponse.json({ templates })
}

const templateSchema = z.object({
  offsetMinutes: z.number().int(), // negative = before meeting
  channel: z.enum(["EMAIL", "WEBHOOK"]).optional().default("EMAIL"),
  subject: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
  active: z.boolean().optional().default(true),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  // Verify event type ownership
  const et = await prisma.eventType.findFirst({ where: { id, userId: session.user.id } })
  if (!et) return NextResponse.json({ error: "Event type not found" }, { status: 404 })

  const body = await req.json()
  const parsed = templateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const template = await prisma.reminderTemplate.create({
    data: { eventTypeId: id, userId: session.user.id, ...parsed.data },
  })

  return NextResponse.json({ template }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const templateId = searchParams.get("templateId")
  if (!templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 })

  await prisma.reminderTemplate.deleteMany({ where: { id: templateId, userId: session.user.id } })
  return NextResponse.json({ success: true })
}
