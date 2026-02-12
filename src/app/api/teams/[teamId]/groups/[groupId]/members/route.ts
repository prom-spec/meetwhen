// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"

interface RouteParams { params: Promise<{ teamId: string; groupId: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { teamId, groupId } = await params

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: session.user.id } } })
  if (!member) return NextResponse.json({ error: "Not a team member" }, { status: 403 })

  // Verify group belongs to this team
  const group = await prisma.teamGroup.findFirst({ where: { id: groupId, teamId } })
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })

  const members = await prisma.teamGroupMember.findMany({
    where: { groupId },
    include: { group: { select: { name: true } } },
  })

  // Get user details
  const userIds = members.map(m => m.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  })
  const userMap = new Map(users.map(u => [u.id, u]))

  return NextResponse.json({
    members: members.map(m => ({ ...m, user: userMap.get(m.userId) || null })),
  })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { teamId, groupId } = await params

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: session.user.id } } })
  if (!member || member.role === "MEMBER") return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  const body = await req.json()
  const parsed = z.object({
    userId: z.string(),
    role: z.enum(["MEMBER", "ADMIN"]).optional().default("MEMBER"),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  // Verify group belongs to this team
  const groupCheck = await prisma.teamGroup.findFirst({ where: { id: groupId, teamId } })
  if (!groupCheck) return NextResponse.json({ error: "Group not found" }, { status: 404 })

  // Verify user is a team member
  const teamMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: parsed.data.userId } } })
  if (!teamMember) return NextResponse.json({ error: "User is not a team member" }, { status: 400 })

  const groupMember = await prisma.teamGroupMember.upsert({
    where: { groupId_userId: { groupId, userId: parsed.data.userId } },
    update: { role: parsed.data.role as any },
    create: { groupId, userId: parsed.data.userId, role: parsed.data.role as any },
  })

  return NextResponse.json({ member: groupMember }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { teamId, groupId } = await params

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: session.user.id } } })
  if (!member || member.role === "MEMBER") return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  // Verify group belongs to this team
  const groupCheck2 = await prisma.teamGroup.findFirst({ where: { id: groupId, teamId } })
  if (!groupCheck2) return NextResponse.json({ error: "Group not found" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  await prisma.teamGroupMember.delete({ where: { groupId_userId: { groupId, userId } } }).catch(() => {})
  return NextResponse.json({ success: true })
}
