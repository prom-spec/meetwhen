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

    const availability = await prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error("Error fetching availability:", error)
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
    const { schedules } = body

    if (!Array.isArray(schedules)) {
      return NextResponse.json({ error: "Invalid schedules format" }, { status: 400 })
    }

    // Clear existing availability for user
    await prisma.availability.deleteMany({
      where: { userId: session.user.id },
    })

    // Create new availability entries
    if (schedules.length > 0) {
      await prisma.availability.createMany({
        data: schedules.map((s: { dayOfWeek: number; startTime: string; endTime: string }) => ({
          userId: session.user.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      })
    }

    const newAvailability = await prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })

    return NextResponse.json(newAvailability)
  } catch (error) {
    console.error("Error saving availability:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
