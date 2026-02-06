import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const eventTypes = await prisma.eventType.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(eventTypes)
  } catch (error) {
    console.error("Error fetching event types:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, slug, description, duration, color, location, bufferBefore, bufferAfter, minNotice, maxDaysAhead } = body

    if (!title || !slug || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

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

    const eventType = await prisma.eventType.create({
      data: {
        userId: session.user.id,
        title,
        slug,
        description: description || null,
        duration: parseInt(duration),
        color: color || "#3B82F6",
        location: location || null,
        bufferBefore: bufferBefore ? parseInt(bufferBefore) : 0,
        bufferAfter: bufferAfter ? parseInt(bufferAfter) : 0,
        minNotice: minNotice ? parseInt(minNotice) : 240,
        maxDaysAhead: maxDaysAhead ? parseInt(maxDaysAhead) : 60,
      },
    })

    return NextResponse.json(eventType, { status: 201 })
  } catch (error) {
    console.error("Error creating event type:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
