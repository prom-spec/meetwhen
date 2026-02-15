import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let sent = 0
  let errors = 0

  try {
    const sequences = await prisma.emailSequence.findMany({
      where: { enabled: true },
      include: { user: true },
    })

    for (const seq of sequences) {
      const triggerField = seq.trigger === "after_booking" ? "createdAt"
        : seq.trigger === "after_meeting" ? "endTime"
        : "startTime" // no_show

      const cutoff = new Date(Date.now() - seq.delayMinutes * 60 * 1000)
      const maxAge = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // don't process older than 7 days

      // Find bookings that match the trigger and haven't been emailed yet
      const bookings = await prisma.booking.findMany({
        where: {
          hostId: seq.userId,
          status: seq.trigger === "no_show" ? "NO_SHOW" : "CONFIRMED",
          [triggerField]: { lte: cutoff, gte: maxAge },
          NOT: {
            id: {
              in: (await prisma.emailSequenceLog.findMany({
                where: { sequenceId: seq.id },
                select: { bookingId: true },
              })).map(l => l.bookingId),
            },
          },
        },
        include: { eventType: true },
      })

      for (const booking of bookings) {
        try {
          // Template variable replacement
          const subject = replaceVars(seq.subject, booking, seq.user)
          const body = replaceVars(seq.body, booking, seq.user)

          // Send via Resend
          const resendKey = process.env.RESEND_API_KEY
          if (resendKey) {
            const { Resend } = await import("resend")
            const resend = new Resend(resendKey)
            await resend.emails.send({
              from: `${seq.user.name || "LetsMeet"} <noreply@letsmeet.link>`,
              to: booking.guestEmail,
              subject,
              html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">${escapeHtml(body).replace(/\n/g, "<br>")}</div>`,
            })
          }

          await prisma.emailSequenceLog.create({
            data: { sequenceId: seq.id, bookingId: booking.id },
          })
          sent++
        } catch {
          errors++
        }
      }
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent, errors })
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function replaceVars(template: string, booking: Record<string, unknown>, user: Record<string, unknown>): string {
  const eventType = booking.eventType as Record<string, unknown> | null
  return template
    .replace(/\{\{guestName\}\}/g, String(booking.guestName || ""))
    .replace(/\{\{eventTitle\}\}/g, String(eventType?.title || ""))
    .replace(/\{\{meetingDate\}\}/g, new Date(booking.startTime as string).toLocaleDateString())
    .replace(/\{\{hostName\}\}/g, String(user.name || ""))
    .replace(/\{\{bookingUrl\}\}/g, `https://letsmeet.link/booking/${booking.id}`)
}
