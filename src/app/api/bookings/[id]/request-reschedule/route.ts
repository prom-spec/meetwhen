import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { sendRescheduleRequestEmail } from "@/lib/email"
import { generateBookingToken } from "@/lib/booking-tokens"
import { apiLogger } from "@/lib/logger"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/bookings/[id]/request-reschedule - Host requests guest to reschedule
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        eventType: {
          include: {
            user: { select: { username: true } },
          },
        },
        host: { select: { id: true, name: true, email: true, timezone: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (booking.hostId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot reschedule a cancelled booking" }, { status: 400 })
    }

    // Mark booking as pending reschedule
    await prisma.booking.update({
      where: { id },
      data: { status: "PENDING_RESCHEDULE" },
    })

    // Build reschedule URL with token for guest auth
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const token = generateBookingToken(booking.id, booking.guestEmail)
    const rescheduleUrl = `${baseUrl}/reschedule/${booking.id}?token=${token}`

    // Send email to guest
    await sendRescheduleRequestEmail({
      booking: {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },
      eventType: {
        title: booking.eventType.title,
      },
      host: {
        name: booking.host.name,
        email: booking.host.email,
        timezone: booking.host.timezone,
      },
      rescheduleUrl,
    })

    return NextResponse.json({ success: true, message: "Reschedule request sent" })
  } catch (error) {
    apiLogger.error("Error requesting reschedule:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
