import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"
import { z } from "zod"

const timeRegex = /^\d{2}:\d{2}$/

const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, "Must be HH:MM format"),
  endTime: z.string().regex(timeRegex, "Must be HH:MM format"),
}).refine(data => data.startTime < data.endTime, {
  message: "startTime must be before endTime",
})

const updateAvailabilitySchema = z.object({
  schedules: z.array(scheduleItemSchema).max(21), // max 3 windows per day × 7 days
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      apiLogger.warn("Unauthorized access to availability")
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 })
    }

    const availability = await prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })

    return NextResponse.json(availability)
  } catch (error) {
    apiLogger.error("Error fetching availability", error)
    return NextResponse.json({ error: "Unable to load availability. Please try again." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      apiLogger.warn("Unauthorized attempt to update availability")
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 })
    }
    
    apiLogger.info("Updating availability", { visitorId: session.user.id })

    const body = await request.json()
    const parsed = updateAvailabilitySchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors; const firstField = Object.keys(fieldErrors)[0]; const firstMsg = firstField ? `${firstField}: ${fieldErrors[firstField]?.[0]}` : "Invalid input"; return NextResponse.json({ error: firstMsg, details: fieldErrors }, { status: 400 })
    }
    const { schedules } = parsed.data

    // Clear existing availability for user
    await prisma.availability.deleteMany({
      where: { userId: session.user.id },
    })

    // Create new availability entries
    if (schedules.length > 0) {
      await prisma.availability.createMany({
        data: schedules.map((s) => ({
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
    apiLogger.error("Error saving availability", error)
    return NextResponse.json({ error: "Unable to save availability. Please try again." }, { status: 500 })
  }
}
