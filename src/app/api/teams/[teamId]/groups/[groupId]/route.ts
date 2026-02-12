import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

interface RouteParams { params: Promise<{ teamId: string; groupId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { teamId, groupId } = await params

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: session.user.id } } })
  if (!member || member.role === "MEMBER") return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  const body = await req.json()
  const group = await prisma.teamGroup.update({
    where: { id: groupId },
    data: { ...(body.name && { name: body.name }), ...(body.description !== undefined && { description: body.description }) },
  })
  return NextResponse.json({ group })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { teamId, groupId } = await params

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: session.user.id } } })
  if (!member || member.role === "MEMBER") return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  await prisma.teamGroup.delete({ where: { id: groupId } })
  return NextResponse.json({ success: true })
}
