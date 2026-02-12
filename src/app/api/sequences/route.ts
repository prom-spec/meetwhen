import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const sequenceSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: z.enum(["after_booking", "after_meeting", "no_show"]),
  delayMinutes: z.number().int().min(0).max(43200).default(60),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sequences = await prisma.emailSequence.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(sequences)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, trigger, delayMinutes, subject, body: emailBody } = sequenceSchema.parse(body)

    const sequence = await prisma.emailSequence.create({
      data: {
        name,
        trigger,
        delayMinutes,
        subject,
        body: emailBody,
        userId: session.user.id,
      },
    })
    return NextResponse.json(sequence, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
