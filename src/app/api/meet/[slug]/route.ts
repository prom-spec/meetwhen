// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { triggerWebhook } from "@/lib/webhooks"
import { apiLogger } from "@/lib/logger"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const link = await prisma.oneOffLink.findUnique({
    where: { slug },
    include: { user: { select: { name: true, image: true, timezone: true } } },
  })

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) return NextResponse.json({ error: "This link has expired." }, { status: 410 })
  if (link.usedCount >= link.maxUses) return NextResponse.json({ error: "This link has been fully used." }, { status: 410 })

  return NextResponse.json(link)
}

const bookSchema = z.object({
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email(),
  guestTimezone: z.string().optional().default("UTC"),
  startTime: z.string().datetime(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const link = await prisma.oneOffLink.findUnique({ where: { slug } })
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) return NextResponse.json({ error: "Expired" }, { status: 410 })
  if (link.usedCount >= link.maxUses) return NextResponse.json({ error: "Fully used" }, { status: 410 })

  const body = await req.json()
  const parsed = bookSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { guestName, guestEmail, guestTimezone, startTime: startTimeStr } = parsed.data
  const startTime = new Date(startTimeStr)
  const endTime = new Date(startTime.getTime() + link.duration * 60000)

  // Verify slot is in availableSlots
  const slots = link.availableSlots as string[]
  if (!slots.some(s => new Date(s).getTime() === startTime.getTime())) {
    return NextResponse.json({ error: "Invalid time slot" }, { status: 400 })
  }

  // Find or create a generic event type for this user
  let eventType = await prisma.eventType.findFirst({
    where: { userId: link.userId, slug: "__one-off__" },
  })
  if (!eventType) {
    eventType = await prisma.eventType.create({
      data: { userId: link.userId, title: "One-Off Meeting", slug: "__one-off__", duration: link.duration },
    })
  }

  // Auto-upsert contact
  let contactId: string | null = null
  try {
    const contact = await prisma.contactProfile.upsert({
      where: { userId_email: { userId: link.userId, email: guestEmail } },
      update: { name: guestName },
      create: { userId: link.userId, email: guestEmail, name: guestName },
    })
    contactId = contact.id
  } catch { /* non-critical */ }

  const booking = await prisma.booking.create({
    data: {
      eventTypeId: eventType.id,
      hostId: link.userId,
      guestName,
      guestEmail,
      guestTimezone,
      startTime,
      endTime,
      status: "CONFIRMED",
      notes: `One-off meeting: ${link.title}`,
      contactId,
    },
  })

  // Increment used count
  await prisma.oneOffLink.update({
    where: { id: link.id },
    data: { usedCount: { increment: 1 } },
  })

  triggerWebhook(link.userId, "booking.created", {
    booking: { id: booking.id, guestName, guestEmail, startTime: startTime.toISOString(), endTime: endTime.toISOString(), status: "CONFIRMED", oneOffLink: slug },
  }).catch(() => {})

  return NextResponse.json({ booking }, { status: 201 })
}
