import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      apiLogger.warn("Unauthorized access to event types")
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 })
    }

    const eventTypes = await prisma.eventType.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(eventTypes)
  } catch (error) {
    apiLogger.error("Error fetching event types", error)
    return NextResponse.json({ error: "Unable to load event types. Please try again." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      apiLogger.warn("Unauthorized attempt to create event type")
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 })
    }
    
    apiLogger.info("Creating event type", { visitorId: session.user.id })

    const body = await request.json()
    const { 
      title, slug, description, duration, color, location, locationType, locationValue, 
      bufferBefore, bufferAfter, minNotice, maxDaysAhead,
      teamId, schedulingType
    } = body

    if (!title || !slug || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // If teamId is provided, verify user is a team member with appropriate permissions
    if (teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
      })

      if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
        return NextResponse.json({ error: "Not authorized to create team event types" }, { status: 403 })
      }

      // Check for existing team slug
      const existingTeamSlug = await prisma.eventType.findFirst({
        where: { teamId, slug },
      })

      if (existingTeamSlug) {
        return NextResponse.json({ error: "Slug already exists for this team" }, { status: 400 })
      }
    } else {
      // Check for existing user slug
      const existingSlug = await prisma.eventType.findUnique({
        where: {
          userId_slug: {
            userId: session.user.id,
            slug,
          },
        },
      })

      if (existingSlug) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 })
      }
    }

    const eventType = await prisma.eventType.create({
      data: {
        userId: session.user.id,
        title,
        slug,
        description: description || null,
        duration: Number(duration),
        color: color || "#3B82F6",
        location: location || null,
        locationType: locationType || "GOOGLE_MEET",
        locationValue: locationValue || null,
        bufferBefore: bufferBefore ? Number(bufferBefore) : 0,
        bufferAfter: bufferAfter ? Number(bufferAfter) : 0,
        minNotice: minNotice ? Number(minNotice) : 240,
        maxDaysAhead: maxDaysAhead ? Number(maxDaysAhead) : 60,
        ...(teamId && { 
          teamId,
          schedulingType: schedulingType || "ROUND_ROBIN",
        }),
      },
    })

    return NextResponse.json(eventType, { status: 201 })
  } catch (error) {
    apiLogger.error("Error creating event type", error)
    return NextResponse.json({ error: "Unable to create event type. Please try again." }, { status: 500 })
  }
}
