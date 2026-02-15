import { NextRequest, NextResponse } from "next/server"
import { authenticateApiKey } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import * as dateFns from "date-fns"
import { apiLogger } from "@/lib/logger"

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await authenticateApiKey(req)
  if (user instanceof NextResponse) return user
  const { id } = await params

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get("date")
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "date query param required (YYYY-MM-DD)" }, { status: 400 })
  }

  const eventType = await prisma.eventType.findFirst({
    where: { id, userId: user.id },
  })
  if (!eventType) return NextResponse.json({ error: "Event type not found" }, { status: 404 })

  const date = dateFns.parseISO(dateStr)
  const dayOfWeek = dateFns.getDay(date) // 0=Sun

  // Get availability for this day
  const availability = await prisma.availability.findMany({
    where: { userId: user.id, dayOfWeek },
  })

  // Get date overrides
  const override = await prisma.dateOverride.findFirst({
    where: { userId: user.id, date },
  })

  if (override && !override.isAvailable) {
    return NextResponse.json({ date: dateStr, slots: [] })
  }

  // Build time slots
  const slots: { start: string; end: string }[] = []
  const windows = override && override.startTime && override.endTime
    ? [{ startTime: override.startTime, endTime: override.endTime }]
    : availability

  for (const window of windows) {
    const [sh, sm] = window.startTime.split(":").map(Number)
    const [eh, em] = window.endTime.split(":").map(Number)
    let cursor = dateFns.setMinutes(dateFns.setHours(date, sh), sm)
    const windowEnd = dateFns.setMinutes(dateFns.setHours(date, eh), em)

    while (dateFns.addMinutes(cursor, eventType.duration) <= windowEnd) {
      const slotEnd = dateFns.addMinutes(cursor, eventType.duration)
      // Check for existing bookings
      const conflict = await prisma.booking.findFirst({
        where: {
          hostId: user.id,
          status: { not: "CANCELLED" },
          startTime: { lt: slotEnd },
          endTime: { gt: cursor },
        },
      })
      if (!conflict) {
        slots.push({
          start: cursor.toISOString(),
          end: slotEnd.toISOString(),
        })
      }
      cursor = dateFns.addMinutes(cursor, eventType.duration + eventType.bufferAfter)
    }
  }

  return NextResponse.json({ date: dateStr, slots })
}
