import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

  const body = await req.json()
  const { name, trigger, delayMinutes, subject, body: emailBody } = body

  if (!name || !trigger || !subject || !emailBody) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const sequence = await prisma.emailSequence.create({
    data: {
      name,
      trigger,
      delayMinutes: delayMinutes || 60,
      subject,
      body: emailBody,
      userId: session.user.id,
    },
  })
  return NextResponse.json(sequence, { status: 201 })
}
