import { NextRequest, NextResponse } from "next/server"
import { authenticateApiKey } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { triggerWebhook } from "@/lib/webhooks"

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await authenticateApiKey(req)
  if (user instanceof NextResponse) return user
  const { id } = await params

  const booking = await prisma.booking.findFirst({
    where: { id, hostId: user.id },
    include: {
      eventType: { select: { id: true, title: true, duration: true, slug: true } },
    },
  })

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  return NextResponse.json({ booking })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await authenticateApiKey(req)
  if (user instanceof NextResponse) return user
  const { id } = await params

  const booking = await prisma.booking.findFirst({
    where: { id, hostId: user.id },
  })

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (booking.status === "CANCELLED") return NextResponse.json({ error: "Already cancelled" }, { status: 400 })

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
  })

  triggerWebhook(user.id, "booking.cancelled", {
    booking: { id: updated.id, guestName: updated.guestName, guestEmail: updated.guestEmail, status: "CANCELLED" },
  }).catch(() => {})

  return NextResponse.json({ booking: updated })
}
