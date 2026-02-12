// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const contact = await prisma.contactProfile.findFirst({
    where: { id, userId: session.user.id },
    include: {
      bookings: {
        orderBy: { startTime: "desc" },
        take: 50,
        include: {
          eventType: { select: { title: true, duration: true } },
        },
      },
    },
  })

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 })
  return NextResponse.json(contact)
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const contact = await prisma.contactProfile.findFirst({ where: { id, userId: session.user.id } })
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 })

  const body = await req.json()
  const { name, phone, company, notes } = body

  const updated = await prisma.contactProfile.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(company !== undefined && { company }),
      ...(notes !== undefined && { notes }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const contact = await prisma.contactProfile.findFirst({ where: { id, userId: session.user.id } })
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 })

  await prisma.contactProfile.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
