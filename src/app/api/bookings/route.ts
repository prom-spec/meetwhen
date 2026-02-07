import { NextRequest, NextResponse } from "next/server"
import * as dateFns from "date-fns"
import prisma from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventTypeId, guestName, guestEmail, guestTimezone, date, time } = body

    if (!eventTypeId || !guestName || !guestEmail || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { user: true },
    })

    if (!eventType || !eventType.isActive) {
      return NextResponse.json({ error: "Event type not found or inactive" }, { status: 404 })
    }

    // Parse start time
    const [hour, minute] = time.split(":").map(Number)
    const startTime = dateFns.setMinutes(
      dateFns.setHours(dateFns.parse(date, "yyyy-MM-dd", new Date()), hour),
      minute
    )
    const endTime = dateFns.addMinutes(startTime, eventType.duration)

    // Validate booking time
    const now = new Date()
    const minBookingTime = dateFns.addMinutes(now, eventType.minNotice)
    if (dateFns.isBefore(startTime, minBookingTime)) {
      return NextResponse.json({ error: "Time slot is too soon" }, { status: 400 })
    }

    // Check for conflicts
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        hostId: eventType.userId,
        status: { not: "CANCELLED" },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    })

    if (conflictingBooking) {
      return NextResponse.json({ error: "Time slot is no longer available" }, { status: 409 })
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        eventTypeId,
        hostId: eventType.userId,
        guestName,
        guestEmail,
        guestTimezone: guestTimezone || "UTC",
        startTime,
        endTime,
        status: "CONFIRMED",
      },
      include: {
        eventType: true,
        host: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
