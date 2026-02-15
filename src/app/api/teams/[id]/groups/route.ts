// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { apiLogger } from "@/lib/logger"

interface RouteParams { params: Promise<{ id: string }> }

async function verifyTeamAccess(teamId: string, userId: string, requireAdmin = false) {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })
  if (!member) return null
  if (requireAdmin && member.role === "MEMBER") return null
  return member
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: teamId } = await params

  const member = await verifyTeamAccess(teamId, session.user.id)
  if (!member) return NextResponse.json({ error: "Not a team member" }, { status: 403 })

  const groups = await prisma.teamGroup.findMany({
    where: { teamId },
    include: { _count: { select: { members: true, eventTypes: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ groups })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: teamId } = await params

  const member = await verifyTeamAccess(teamId, session.user.id, true)
  if (!member) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  const body = await req.json()
  const parsed = z.object({ name: z.string().min(1).max(100), description: z.string().max(500).optional() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const group = await prisma.teamGroup.create({
    data: { teamId, name: parsed.data.name, description: parsed.data.description },
  })

  return NextResponse.json({ group }, { status: 201 })
}
