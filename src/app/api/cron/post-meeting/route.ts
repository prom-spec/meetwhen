import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPostMeetingFollowup } from "@/lib/email"

export async function POST(request: Request) {
  // Simple auth via secret header (for cron job security)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  // Find bookings that ended 20-40 minutes ago (targeting ~30 min window)
  const windowStart = new Date(now.getTime() - 40 * 60 * 1000)
  const windowEnd = new Date(now.getTime() - 20 * 60 * 1000)

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      postMeetingEmailSent: false,
      endTime: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    include: {
      host: {
        select: { name: true },
      },
    },
    take: 50, // Process in batches
  })

  const results = []

  for (const booking of bookings) {
    const result = await sendPostMeetingFollowup({
      bookingId: booking.id,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      hostName: booking.host.name || "your host",
    })

    // Mark as sent regardless of success to avoid retrying forever
    await prisma.booking.update({
      where: { id: booking.id },
      data: { postMeetingEmailSent: true },
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
