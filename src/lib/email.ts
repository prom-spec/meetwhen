import { Resend } from "resend"
import { formatInTimeZone } from "date-fns-tz"
import BookingConfirmation from "@/emails/BookingConfirmation"
import BookingNotification from "@/emails/BookingNotification"
import BookingReminder from "@/emails/BookingReminder"

// Lazy initialization to avoid build errors when API key is not set
let resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_EMAIL = process.env.EMAIL_FROM || "MeetWhen <noreply@meetwhen.app>"

interface BookingEmailData {
  booking: {
    id: string
    guestName: string
    guestEmail: string
    guestTimezone: string
    startTime: Date
    endTime: Date
    meetingUrl?: string | null
  }
  eventType: {
    title: string
    location?: string | null
  }
  host: {
    name: string | null
    email: string
    timezone?: string
  }
}

function formatTimeRange(start: Date, end: Date, timezone: string): { startTime: string; endTime: string } {
  const dateFormat = "EEEE, MMMM d, yyyy"
  const timeFormat = "h:mm a"
  
  const startDate = formatInTimeZone(start, timezone, dateFormat)
  const startTimeStr = formatInTimeZone(start, timezone, timeFormat)
  const endTimeStr = formatInTimeZone(end, timezone, timeFormat)
  
  return {
    startTime: `${startDate} at ${startTimeStr}`,
    endTime: endTimeStr,
  }
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  const { booking, eventType, host } = data
  
  const client = getResend()
  if (!client) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return { success: false, error: "Email not configured" }
  }

  const { startTime, endTime } = formatTimeRange(
    booking.startTime,
    booking.endTime,
    booking.guestTimezone
  )

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: booking.guestEmail,
      subject: `Booking Confirmed: ${eventType.title} with ${host.name || "Host"}`,
      react: BookingConfirmation({
        guestName: booking.guestName,
        hostName: host.name || "Host",
        eventTitle: eventType.title,
        startTime,
        endTime,
        timezone: booking.guestTimezone,
        meetingUrl: booking.meetingUrl,
        location: eventType.location,
      }),
    })

    console.log("Booking confirmation email sent:", result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error("Failed to send booking confirmation:", error)
    return { success: false, error }
  }
}

export async function sendBookingNotification(data: BookingEmailData) {
  const { booking, eventType, host } = data
  
  const client = getResend()
  if (!client) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return { success: false, error: "Email not configured" }
  }

  const hostTimezone = host.timezone || "UTC"
  const { startTime, endTime } = formatTimeRange(
    booking.startTime,
    booking.endTime,
    hostTimezone
  )

  const dashboardUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/bookings`

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: host.email,
      subject: `New Booking: ${booking.guestName} booked ${eventType.title}`,
      react: BookingNotification({
        hostName: host.name || "Host",
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        eventTitle: eventType.title,
        startTime,
        endTime,
        timezone: hostTimezone,
        dashboardUrl,
      }),
    })

    console.log("Booking notification email sent:", result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error("Failed to send booking notification:", error)
    return { success: false, error }
  }
}

export async function sendBookingReminder(data: BookingEmailData & { minutesUntil: number; toHost: boolean }) {
  const { booking, eventType, host, minutesUntil, toHost } = data
  
  const client = getResend()
  if (!client) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return { success: false, error: "Email not configured" }
  }

  const recipientEmail = toHost ? host.email : booking.guestEmail
  const recipientName = toHost ? (host.name || "Host") : booking.guestName
  const recipientTimezone = toHost ? (host.timezone || "UTC") : booking.guestTimezone
  const otherPartyName = toHost ? booking.guestName : (host.name || "Host")

  const { startTime, endTime } = formatTimeRange(
    booking.startTime,
    booking.endTime,
    recipientTimezone
  )

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Reminder: ${eventType.title} starts soon`,
      react: BookingReminder({
        recipientName,
        otherPartyName,
        eventTitle: eventType.title,
        startTime,
        endTime,
        timezone: recipientTimezone,
        meetingUrl: booking.meetingUrl,
        location: eventType.location,
        isHost: toHost,
        minutesUntil,
      }),
    })

    console.log("Booking reminder email sent:", result)
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error("Failed to send booking reminder:", error)
    return { success: false, error }
  }
}

export async function sendBookingEmails(data: BookingEmailData) {
  // Send both emails in parallel, don't fail the booking if emails fail
  const results = await Promise.allSettled([
    sendBookingConfirmation(data),
    sendBookingNotification(data),
  ])

  return {
    confirmation: results[0].status === "fulfilled" ? results[0].value : { success: false, error: results[0].reason },
    notification: results[1].status === "fulfilled" ? results[1].value : { success: false, error: results[1].reason },
  }
}
