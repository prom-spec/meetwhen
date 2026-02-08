import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const eventType = await prisma.eventType.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!eventType) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    return NextResponse.json(eventType)
  } catch (error) {
    console.error("Error fetching event type:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingEventType = await prisma.eventType.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingEventType) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    const body = await request.json()
    const { title, slug, description, duration, color, location, locationType, locationValue, isActive, bufferBefore, bufferAfter, minNotice, maxDaysAhead } = body

    if (slug && slug !== existingEventType.slug) {
      const slugExists = await prisma.eventType.findFirst({
        where: {
          userId: session.user.id,
          slug,
          id: { not: id },
        },
      })

      if (slugExists) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 })
      }
    }

    const eventType = await prisma.eventType.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(duration !== undefined && { duration: Number(duration) }),
        ...(color !== undefined && { color }),
        ...(location !== undefined && { location }),
        ...(locationType !== undefined && { locationType }),
        ...(locationValue !== undefined && { locationValue }),
        ...(isActive !== undefined && { isActive }),
        ...(bufferBefore !== undefined && { bufferBefore: Number(bufferBefore) }),
        ...(bufferAfter !== undefined && { bufferAfter: Number(bufferAfter) }),
        ...(minNotice !== undefined && { minNotice: Number(minNotice) }),
        ...(maxDaysAhead !== undefined && { maxDaysAhead: Number(maxDaysAhead) }),
      },
    })

    return NextResponse.json(eventType)
  } catch (error) {
    console.error("Error updating event type:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const eventType = await prisma.eventType.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!eventType) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    await prisma.eventType.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting event type:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
