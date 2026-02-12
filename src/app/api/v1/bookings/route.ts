// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { authenticateApiKey } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import * as dateFns from "date-fns"
import { triggerWebhook } from "@/lib/webhooks"
import { z } from "zod"

const createBookingSchema = z.object({
  eventTypeId: z.string(),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email(),
  guestTimezone: z.string().optional().default("UTC"),
  startTime: z.string().datetime(),
  notes: z.string().max(2000).optional(),
})

export async function GET(req: NextRequest) {
  const user = await authenticateApiKey(req)
  if (user instanceof NextResponse) return user

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
  const offset = parseInt(searchParams.get("offset") || "0")

  const bookings = await prisma.booking.findMany({
    where: {
      hostId: user.id,
      ...(status ? { status: status as any } : {}),
    },
    include: {
      eventType: { select: { id: true, title: true, duration: true, slug: true } },
    },
    orderBy: { startTime: "desc" },
    take: limit,
    skip: offset,
  })

  return NextResponse.json({ bookings, limit, offset })
}

export async function POST(req: NextRequest) {
  const user = await authenticateApiKey(req)
  if (user instanceof NextResponse) return user

  const body = await req.json()
  const parsed = createBookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { eventTypeId, guestName, guestEmail, guestTimezone, startTime: startTimeStr, notes } = parsed.data

  const eventType = await prisma.eventType.findFirst({
    where: { id: eventTypeId, userId: user.id, isActive: true },
  })
  if (!eventType) return NextResponse.json({ error: "Event type not found" }, { status: 404 })

  const startTime = new Date(startTimeStr)
  const endTime = dateFns.addMinutes(startTime, eventType.duration)

  // Conflict check
  const conflict = await prisma.booking.findFirst({
    where: {
      hostId: user.id,
      status: { not: "CANCELLED" },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  })
  if (conflict) return NextResponse.json({ error: "Time slot conflict" }, { status: 409 })

  // Auto-upsert contact
  let contactId: string | null = null
  try {
    const contact = await prisma.contactProfile.upsert({
      where: { userId_email: { userId: user.id, email: guestEmail } },
      update: { name: guestName },
      create: { userId: user.id, email: guestEmail, name: guestName },
    })
    contactId = contact.id
  } catch { /* non-critical */ }

  const booking = await prisma.booking.create({
    data: {
      eventTypeId,
      hostId: user.id,
      guestName,
      guestEmail,
      guestTimezone,
      startTime,
      endTime,
      status: "CONFIRMED",
      notes: notes || null,
      contactId,
    },
    include: {
      eventType: { select: { id: true, title: true, duration: true } },
    },
  })

  triggerWebhook(user.id, "booking.created", {
    booking: { id: booking.id, guestName, guestEmail, startTime: startTime.toISOString(), endTime: endTime.toISOString(), status: "CONFIRMED" },
  }).catch(() => {})

  return NextResponse.json({ booking }, { status: 201 })
}
