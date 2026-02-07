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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        timezone: true,
        calendarSyncEnabled: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if Google account is connected
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google",
      },
      select: {
        id: true,
        scope: true,
      },
    })

    const hasCalendarScope = googleAccount?.scope?.includes("calendar") ?? false

    return NextResponse.json({
      ...user,
      googleConnected: !!googleAccount,
      hasCalendarScope,
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, username, timezone, calendarSyncEnabled } = body

    // Validate username if provided
    if (username !== undefined) {
      // Check format
      if (!/^[a-z0-9_-]+$/i.test(username)) {
        return NextResponse.json(
          { error: "Username can only contain letters, numbers, underscores, and hyphens" },
          { status: 400 }
        )
      }
      
      // Check uniqueness
      const existing = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: session.user.id },
        },
      })
      
      if (existing) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    
    if (name !== undefined) updateData.name = name
    if (username !== undefined) updateData.username = username
    if (timezone !== undefined) updateData.timezone = timezone
    if (calendarSyncEnabled !== undefined) updateData.calendarSyncEnabled = calendarSyncEnabled

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        timezone: true,
        calendarSyncEnabled: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
