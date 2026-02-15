import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper to check if user is team admin/owner
async function isTeamAdmin(teamId: string, userId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })
  return membership?.role === "OWNER" || membership?.role === "ADMIN"
}

// GET /api/teams/[id]/members - List team members
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id: teamId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check membership
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: session.user.id } },
    })

    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 })
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            image: true, 
            timezone: true,
            username: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { priority: "asc" }],
    })

    return NextResponse.json(members)
  } catch (error) {
    apiLogger.error("Error fetching team members:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/teams/[id]/members - Add a member
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id: teamId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin/owner
    const canManage = await isTeamAdmin(teamId, session.user.id)
    if (!canManage) {
      return NextResponse.json({ error: "Not authorized to add members" }, { status: 403 })
    }

    const body = await request.json()
    const { email, role = "MEMBER", priority = 0 } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    })

    if (!userToAdd) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: userToAdd.id } },
    })

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a team member" }, { status: 400 })
    }

    // Validate role - can't add as OWNER
    if (role === "OWNER") {
      return NextResponse.json({ error: "Cannot add member as owner" }, { status: 400 })
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: userToAdd.id,
        role: role as "ADMIN" | "MEMBER",
        priority: parseInt(priority) || 0,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, timezone: true },
        },
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    apiLogger.error("Error adding team member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/teams/[id]/members - Update a member (role, priority)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id: teamId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin/owner
    const canManage = await isTeamAdmin(teamId, session.user.id)
    if (!canManage) {
      return NextResponse.json({ error: "Not authorized to update members" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role, priority } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Can't change owner role
    const targetMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    })

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    if (targetMember.role === "OWNER") {
      return NextResponse.json({ error: "Cannot change owner's role" }, { status: 400 })
    }

    const member = await prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: {
        ...(role && role !== "OWNER" && { role }),
        ...(priority !== undefined && { priority: parseInt(priority) }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, timezone: true },
        },
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    apiLogger.error("Error updating team member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/teams/[id]/members - Remove a member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id: teamId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Users can remove themselves, admins can remove others
    const isSelf = userId === session.user.id
    const canManage = await isTeamAdmin(teamId, session.user.id)

    if (!isSelf && !canManage) {
      return NextResponse.json({ error: "Not authorized to remove members" }, { status: 403 })
    }

    // Check target membership
    const targetMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    })

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Can't remove the owner
    if (targetMember.role === "OWNER") {
      return NextResponse.json({ error: "Cannot remove team owner" }, { status: 400 })
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    apiLogger.error("Error removing team member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
