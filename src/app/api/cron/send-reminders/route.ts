import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendBookingReminder } from "@/lib/email"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  // Find bookings starting in ~24h (23.5h to 24.5h from now)
  const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000)

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderEmailSent: false,
      startTime: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    include: {
      host: {
        select: { name: true, email: true, timezone: true },
      },
      eventType: {
        select: { title: true, location: true },
      },
    },
    take: 50,
  })

  const results = []

  for (const booking of bookings) {
    const minutesUntil = Math.round(
      (booking.startTime.getTime() - now.getTime()) / (60 * 1000)
    )

    const emailData = {
      booking: {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        startTime: booking.startTime,
        endTime: booking.endTime,
        meetingUrl: booking.meetingUrl,
      },
      eventType: {
        title: booking.eventType.title,
        location: booking.eventType.location,
      },
      host: {
        name: booking.host.name,
        email: booking.host.email,
        timezone: booking.host.timezone ?? undefined,
      },
      minutesUntil,
      toHost: false,
    }

    // Send reminder to guest only
    const result = await sendBookingReminder(emailData)

    // Mark as sent regardless of success to avoid retrying forever
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderEmailSent: true },
    })

    results.push({
      bookingId: booking.id,
      success: result.success,
    })
  }

  return NextResponse.json({
    processed: results.length,
    results,
  })
}
