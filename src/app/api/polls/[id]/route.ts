import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"

const updatePollSchema = z.object({
  status: z.enum(["open", "closed", "booked"]).optional(),
  finalOptionId: z.string().optional(),
}).strict()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const poll = await prisma.meetingPoll.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: { startTime: "asc" },
          include: { votes: true },
        },
        votes: true,
        creator: { select: { name: true, email: true } },
      },
    })

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }

    // Check if requester is the poll creator — if not, strip voter emails (PII)
    const session = await getServerSession(authOptions)
    const isCreator = session?.user?.id === poll.createdBy

    if (!isCreator) {
      const sanitized = {
        ...poll,
        creator: { name: poll.creator.name },
        options: poll.options.map((opt) => ({
          ...opt,
          votes: opt.votes.map(({ voterEmail: _email, ...rest }) => rest),
        })),
        votes: poll.votes.map(({ voterEmail: _email, ...rest }) => rest),
      }
      return NextResponse.json(sanitized)
    }

    return NextResponse.json(poll)
  } catch (error) {
    console.error("Get poll error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const poll = await prisma.meetingPoll.findUnique({ where: { id } })

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }
    if (poll.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updatePollSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const { status, finalOptionId } = parsed.data

    const updated = await prisma.meetingPoll.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(finalOptionId && { finalOptionId }),
      },
      include: { options: { include: { votes: true } }, votes: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update poll error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
