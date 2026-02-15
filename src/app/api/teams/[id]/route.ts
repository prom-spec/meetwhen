import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
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

// GET /api/teams/[id] - Get team details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true, timezone: true, username: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, timezone: true, username: true },
            },
          },
          orderBy: [{ role: "asc" }, { priority: "asc" }],
        },
        eventTypes: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            duration: true,
            color: true,
            isActive: true,
            schedulingType: true,
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Check if user is a member
    const isMember = team.members.some((m) => m.userId === session.user.id)
    if (!isMember) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 })
    }

    return NextResponse.json(team)
  } catch (error) {
    apiLogger.error("Error fetching team:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/teams/[id] - Update team
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin/owner
    const canEdit = await isTeamAdmin(id, session.user.id)
    if (!canEdit) {
      return NextResponse.json({ error: "Not authorized to edit team" }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug } = body

    // If changing slug, check it's not taken
    if (slug) {
      const existingTeam = await prisma.team.findFirst({
        where: { slug, id: { not: id } },
      })
      if (existingTeam) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 400 })
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    })

    logAudit(session.user.id, "team.updated", "team", id, { name, slug })

    return NextResponse.json(team)
  } catch (error) {
    apiLogger.error("Error updating team:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only owner can delete
    const team = await prisma.team.findUnique({
      where: { id },
    })

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    if (team.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Only team owner can delete" }, { status: 403 })
    }

    await prisma.team.delete({ where: { id } })

    logAudit(session.user.id, "team.deleted", "team", id, { name: team.name })

    return NextResponse.json({ success: true })
  } catch (error) {
    apiLogger.error("Error deleting team:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
