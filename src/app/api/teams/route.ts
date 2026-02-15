import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { apiLogger } from "@/lib/logger"

// GET /api/teams - List all teams the user belongs to
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: { userId: session.user.id },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true, username: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        eventTypes: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            slug: true,
            duration: true,
            schedulingType: true,
          },
        },
        _count: {
          select: { members: true, eventTypes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(teams)
  } catch (error) {
    apiLogger.error("Error fetching teams:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ 
        error: "Slug can only contain lowercase letters, numbers, and hyphens" 
      }, { status: 400 })
    }

    // Check if slug already exists for this owner
    const existingTeam = await prisma.team.findUnique({
      where: { ownerId_slug: { ownerId: session.user.id, slug } },
    })

    if (existingTeam) {
      return NextResponse.json({ error: "You already have a team with this slug" }, { status: 400 })
    }

    // Create team and add owner as member
    const team = await prisma.team.create({
      data: {
        name,
        slug,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
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

    logAudit(session.user.id, "team.created", "team", team.id, { name, slug })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    apiLogger.error("Error creating team:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
