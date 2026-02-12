import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"

const createContactSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  const where = {
    userId: session.user.id,
    ...(search ? {
      OR: [
        { email: { contains: search, mode: "insensitive" as const } },
        { name: { contains: search, mode: "insensitive" as const } },
        { company: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  }

  const [contacts, total] = await Promise.all([
    prisma.contactProfile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { bookings: true } } },
    }),
    prisma.contactProfile.count({ where }),
  ])

  return NextResponse.json({ contacts, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const contact = await prisma.contactProfile.upsert({
    where: { userId_email: { userId: session.user.id, email: parsed.data.email } },
    update: { ...parsed.data, updatedAt: new Date() },
    create: { ...parsed.data, userId: session.user.id },
  })

  return NextResponse.json(contact, { status: 201 })
}
