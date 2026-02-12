import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"

const createSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  duration: z.coerce.number().int().min(5).max(480),
  availableSlots: z.array(z.string().datetime()).min(1),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.coerce.number().int().min(1).max(100).optional(),
})

function generateSlug(): string {
  return crypto.randomBytes(6).toString("base64url")
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const links = await prisma.oneOffLink.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { bookings: true },
  })

  return NextResponse.json(links)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { title, duration, availableSlots, expiresAt, maxUses } = parsed.data

  let slug = generateSlug()
  while (await prisma.oneOffLink.findUnique({ where: { slug } })) {
    slug = generateSlug()
  }

  const link = await prisma.oneOffLink.create({
    data: {
      userId: session.user.id,
      slug,
      title,
      duration,
      availableSlots: JSON.stringify(availableSlots),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: maxUses ?? 1,
    },
  })

  return NextResponse.json(link, { status: 201 })
}
