import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { z } from "zod"

const voteSchema = z.object({
  voterName: z.string().min(1).max(100).trim(),
  voterEmail: z.string().email(),
  votes: z.array(z.object({
    optionId: z.string(),
    availability: z.enum(["yes", "maybe", "no"]),
  })).min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const poll = await prisma.meetingPoll.findUnique({
      where: { id },
      include: { options: true },
    })

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }
    if (poll.status !== "open") {
      return NextResponse.json({ error: "Poll is closed" }, { status: 400 })
    }

    const body = await req.json()
    const parsed = voteSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstField = Object.keys(fieldErrors)[0]
      const firstMsg = firstField ? `${firstField}: ${fieldErrors[firstField]?.[0]}` : "Invalid input"
      return NextResponse.json({ error: firstMsg, details: fieldErrors }, { status: 400 })
    }
    const data = parsed.data

    // Validate all optionIds belong to this poll
    const validOptionIds = new Set(poll.options.map((o) => o.id))
    for (const v of data.votes) {
      if (!validOptionIds.has(v.optionId)) {
        return NextResponse.json({ error: "Invalid option ID" }, { status: 400 })
      }
    }

    // Upsert votes (allows re-voting)
    const results = await prisma.$transaction(
      data.votes.map((v) =>
        prisma.pollVote.upsert({
          where: {
            optionId_voterEmail: {
              optionId: v.optionId,
              voterEmail: data.voterEmail,
            },
          },
          update: {
            voterName: data.voterName,
            availability: v.availability,
          },
          create: {
            pollId: id,
            optionId: v.optionId,
            voterName: data.voterName,
            voterEmail: data.voterEmail,
            availability: v.availability,
          },
        })
      )
    )

    return NextResponse.json({ success: true, votes: results })
  } catch (error) {
    console.error("Vote error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
