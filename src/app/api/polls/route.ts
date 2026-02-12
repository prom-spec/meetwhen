import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"

const createPollSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  duration: z.coerce.number().int().min(5).max(480),
  timezone: z.string().min(1),
  options: z.array(z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
  })).min(2, "At least 2 time options required"),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createPollSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstField = Object.keys(fieldErrors)[0]
      const firstMsg = firstField ? `${firstField}: ${fieldErrors[firstField]?.[0]}` : "Invalid input"
      return NextResponse.json({ error: firstMsg, details: fieldErrors }, { status: 400 })
    }
    const data = parsed.data

    const poll = await prisma.meetingPoll.create({
      data: {
        title: data.title,
        description: data.description,
        duration: data.duration,
        timezone: data.timezone,
        createdBy: session.user.id,
        options: {
          create: data.options.map((o) => ({
            startTime: new Date(o.startTime),
            endTime: new Date(o.endTime),
          })),
        },
      },
      include: { options: true },
    })

    return NextResponse.json(poll, { status: 201 })
  } catch (error) {
    console.error("Create poll error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const polls = await prisma.meetingPoll.findMany({
      where: { createdBy: session.user.id },
      include: {
        options: true,
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(polls)
  } catch (error) {
    console.error("List polls error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
