import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.emailSequence.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.emailSequence.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.trigger !== undefined && { trigger: body.trigger }),
      ...(body.delayMinutes !== undefined && { delayMinutes: body.delayMinutes }),
      ...(body.subject !== undefined && { subject: body.subject }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await prisma.emailSequence.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.emailSequence.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
