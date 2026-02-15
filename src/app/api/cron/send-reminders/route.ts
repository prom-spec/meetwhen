// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendBookingReminder } from "@/lib/email"
import { apiLogger } from "@/lib/logger"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const results: { bookingId: string; success: boolean; source: string }[] = []

  // ── Process ReminderJob records (new multi-step system) ──
  const pendingJobs = await prisma.reminderJob.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: now },
    },
    include: {
      template: true,
      booking: {
        include: {
          host: { select: { name: true, email: true, timezone: true } },
          eventType: { select: { title: true, location: true } },
        },
      },
    },
    take: 100,
  })

  for (const job of pendingJobs) {
    if (job.booking.status === "CANCELLED") {
      await prisma.reminderJob.update({ where: { id: job.id }, data: { status: "SENT", sentAt: now } })
      continue
    }

    try {
      const minutesUntil = Math.round((job.booking.startTime.getTime() - now.getTime()) / 60000)

      if (job.template.channel === "EMAIL") {
        const result = await sendBookingReminder({
          booking: {
            id: job.booking.id,
            guestName: job.booking.guestName,
            guestEmail: job.booking.guestEmail,
            guestTimezone: job.booking.guestTimezone,
            startTime: job.booking.startTime,
            endTime: job.booking.endTime,
            meetingUrl: job.booking.meetingUrl,
          },
          eventType: {
            title: job.booking.eventType.title,
            location: job.booking.eventType.location,
          },
          host: {
            name: job.booking.host.name,
            email: job.booking.host.email,
            timezone: job.booking.host.timezone ?? undefined,
          },
          minutesUntil,
          toHost: false,
          customSubject: job.template.subject || undefined,
          customBody: job.template.body || undefined,
        })

        results.push({ bookingId: job.booking.id, success: result.success, source: "reminder_job" })
      }

      await prisma.reminderJob.update({ where: { id: job.id }, data: { status: "SENT", sentAt: now } })
    } catch {
      await prisma.reminderJob.update({ where: { id: job.id }, data: { status: "FAILED" } })
      results.push({ bookingId: job.booking.id, success: false, source: "reminder_job" })
    }
  }

  // ── Legacy: Process bookings without ReminderJobs (24h window) ──
  const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000)

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderEmailSent: false,
      startTime: { gte: windowStart, lte: windowEnd },
    },
    include: {
      host: { select: { name: true, email: true, timezone: true } },
      eventType: { select: { title: true, location: true } },
      reminderJobs: { take: 1 },
    },
    take: 50,
  })

  for (const booking of bookings) {
    // Skip if already handled by ReminderJob system
    if (booking.reminderJobs.length > 0) {
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderEmailSent: true } })
      continue
    }

    const minutesUntil = Math.round((booking.startTime.getTime() - now.getTime()) / 60000)
    const result = await sendBookingReminder({
      booking: {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        startTime: booking.startTime,
        endTime: booking.endTime,
        meetingUrl: booking.meetingUrl,
      },
      eventType: { title: booking.eventType.title, location: booking.eventType.location },
      host: { name: booking.host.name, email: booking.host.email, timezone: booking.host.timezone ?? undefined },
      minutesUntil,
      toHost: false,
    })

    await prisma.booking.update({ where: { id: booking.id }, data: { reminderEmailSent: true } })
    results.push({ bookingId: booking.id, success: result.success, source: "legacy" })
  }

  return NextResponse.json({ processed: results.length, results })
}
