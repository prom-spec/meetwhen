import type { Resend } from "resend"
import { formatInTimeZone } from "date-fns-tz"
import BookingConfirmation from "@/emails/BookingConfirmation"
import BookingNotification from "@/emails/BookingNotification"
import BookingReminder from "@/emails/BookingReminder"
import BookingCancellation from "@/emails/BookingCancellation"
import BookingReschedule from "@/emails/BookingReschedule"
import RescheduleRequest from "@/emails/RescheduleRequest"
import { emailLogger } from "./logger"
import { generateBookingToken } from "./booking-tokens"

// Lazy initialization with dynamic import to avoid build errors when env var is not set
let resendInstance: Resend | null = null
async function getResend(): Promise<Resend | null> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    emailLogger.warn("RESEND_API_KEY not set, email sending disabled")
    return null
  }
  if (!resendInstance) {
    const { Resend: ResendClass } = await import("resend")
    resendInstance = new ResendClass(key)
    emailLogger.info("Resend client initialized")
  }
  return resendInstance
}

const FROM_EMAIL = process.env.EMAIL_FROM || "MeetWhen <onboarding@resend.dev>"

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
  
  emailLogger.info("Sending booking confirmation", { 
    bookingId: booking.id, 
    guestEmail: booking.guestEmail,
    eventType: eventType.title 
  })
  
  const client = await getResend()
  if (!client) {
    emailLogger.warn("Email client not available, skipping confirmation email", { bookingId: booking.id })
    return { success: false, error: "Email not configured" }
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const token = generateBookingToken(booking.id, booking.guestEmail)
  const bookingUrl = `${baseUrl}/booking/${booking.id}?token=${token}`

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
        bookingUrl,
      }),
    })

    emailLogger.info("Booking confirmation email sent", { 
      bookingId: booking.id, 
      messageId: result.data?.id,
      guestEmail: booking.guestEmail 
    })
    return { success: true, id: result.data?.id }
  } catch (error) {
    emailLogger.error("Failed to send booking confirmation", error, { 
      bookingId: booking.id,
      guestEmail: booking.guestEmail 
    })
    return { success: false, error }
  }
}

export async function sendBookingNotification(data: BookingEmailData) {
  const { booking, eventType, host } = data
  
  emailLogger.info("Sending booking notification to host", { 
    bookingId: booking.id, 
    hostEmail: host.email 
  })
  
  const client = await getResend()
  if (!client) {
    emailLogger.warn("Email client not available, skipping notification email", { bookingId: booking.id })
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
        meetingUrl: booking.meetingUrl,
      }),
    })

    emailLogger.info("Booking notification email sent", { 
      bookingId: booking.id, 
      messageId: result.data?.id,
      hostEmail: host.email 
    })
    return { success: true, id: result.data?.id }
  } catch (error) {
    emailLogger.error("Failed to send booking notification", error, { 
      bookingId: booking.id,
      hostEmail: host.email 
    })
    return { success: false, error }
  }
}

export async function sendBookingReminder(data: BookingEmailData & { minutesUntil: number; toHost: boolean }) {
  const { booking, eventType, host, minutesUntil, toHost } = data
  
  const recipientEmail = toHost ? host.email : booking.guestEmail
  const recipientName = toHost ? (host.name || "Host") : booking.guestName
  const recipientTimezone = toHost ? (host.timezone || "UTC") : booking.guestTimezone
  const otherPartyName = toHost ? booking.guestName : (host.name || "Host")

  emailLogger.info("Sending booking reminder", { 
    bookingId: booking.id, 
    recipientEmail,
    minutesUntil,
    toHost 
  })
  
  const client = await getResend()
  if (!client) {
    emailLogger.warn("Email client not available, skipping reminder email", { bookingId: booking.id })
    return { success: false, error: "Email not configured" }
  }

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

    emailLogger.info("Booking reminder email sent", { 
      bookingId: booking.id, 
      messageId: result.data?.id,
      recipientEmail 
    })
    return { success: true, id: result.data?.id }
  } catch (error) {
    emailLogger.error("Failed to send booking reminder", error, { 
      bookingId: booking.id,
      recipientEmail 
    })
    return { success: false, error }
  }
}

export async function sendBookingEmails(data: BookingEmailData) {
  emailLogger.info("Sending booking emails", { bookingId: data.booking.id })
  
  // Send both emails in parallel, don't fail the booking if emails fail
  const results = await Promise.allSettled([
    sendBookingConfirmation(data),
    sendBookingNotification(data),
  ])

  const summary = {
    confirmation: results[0].status === "fulfilled" ? results[0].value : { success: false, error: results[0].reason },
    notification: results[1].status === "fulfilled" ? results[1].value : { success: false, error: results[1].reason },
  }
  
  emailLogger.info("Booking emails completed", { 
    bookingId: data.booking.id,
    confirmationSuccess: summary.confirmation.success,
    notificationSuccess: summary.notification.success 
  })

  return summary
}

interface CancellationEmailData extends BookingEmailData {
  cancelledBy: "host" | "guest"
}

export async function sendBookingCancellation(data: CancellationEmailData) {
  const { booking, eventType, host, cancelledBy } = data
  
  emailLogger.info("Sending cancellation emails", { 
    bookingId: booking.id, 
    cancelledBy 
  })
  
  const client = await getResend()
  if (!client) {
    emailLogger.warn("Email client not available, skipping cancellation emails", { bookingId: booking.id })
    return { success: false, error: "Email not configured" }
  }

  // Send to guest
  const guestTime = formatTimeRange(booking.startTime, booking.endTime, booking.guestTimezone)
  const guestResult = await client.emails.send({
    from: FROM_EMAIL,
    to: booking.guestEmail,
    subject: `Cancelled: ${eventType.title} with ${host.name || "Host"}`,
    react: BookingCancellation({
      recipientName: booking.guestName,
      otherPartyName: host.name || "Host",
      eventTitle: eventType.title,
      startTime: guestTime.startTime,
      endTime: guestTime.endTime,
      timezone: booking.guestTimezone,
      cancelledBy,
      isHost: false,
    }),
  }).catch((err) => {
    emailLogger.error("Failed to send guest cancellation email", err, { bookingId: booking.id })
    return { error: err }
  })

  // Send to host
  const hostTimezone = host.timezone || "UTC"
  const hostTime = formatTimeRange(booking.startTime, booking.endTime, hostTimezone)
  const hostResult = await client.emails.send({
    from: FROM_EMAIL,
    to: host.email,
    subject: `Cancelled: ${eventType.title} with ${booking.guestName}`,
    react: BookingCancellation({
      recipientName: host.name || "Host",
      otherPartyName: booking.guestName,
      eventTitle: eventType.title,
      startTime: hostTime.startTime,
      endTime: hostTime.endTime,
      timezone: hostTimezone,
      cancelledBy,
      isHost: true,
    }),
  }).catch((err) => {
    emailLogger.error("Failed to send host cancellation email", err, { bookingId: booking.id })
    return { error: err }
  })

  emailLogger.info("Cancellation emails sent", { bookingId: booking.id })
  return { success: true, guestResult, hostResult }
}

interface RescheduleEmailData extends BookingEmailData {
  oldStartTime: Date
  oldEndTime: Date
  rescheduledBy: "host" | "guest"
}

export async function sendBookingReschedule(data: RescheduleEmailData) {
  const { booking, eventType, host, oldStartTime, oldEndTime, rescheduledBy } = data
  
  emailLogger.info("Sending reschedule emails", { 
    bookingId: booking.id, 
    rescheduledBy 
  })
  
  const client = await getResend()
  if (!client) {
    emailLogger.warn("Email client not available, skipping reschedule emails", { bookingId: booking.id })
    return { success: false, error: "Email not configured" }
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const guestToken = generateBookingToken(booking.id, booking.guestEmail)
  const bookingUrl = `${baseUrl}/booking/${booking.id}`

  // Send to guest
  const guestOldTime = formatTimeRange(oldStartTime, oldEndTime, booking.guestTimezone)
  const guestNewTime = formatTimeRange(booking.startTime, booking.endTime, booking.guestTimezone)
  const guestResult = await client.emails.send({
    from: FROM_EMAIL,
    to: booking.guestEmail,
    subject: `Rescheduled: ${eventType.title} with ${host.name || "Host"}`,
    react: BookingReschedule({
      recipientName: booking.guestName,
      otherPartyName: host.name || "Host",
      eventTitle: eventType.title,
      oldStartTime: guestOldTime.startTime,
      oldEndTime: guestOldTime.endTime,
      newStartTime: guestNewTime.startTime,
      newEndTime: guestNewTime.endTime,
      timezone: booking.guestTimezone,
      rescheduledBy,
      isHost: false,
      bookingUrl: `${bookingUrl}?token=${guestToken}`,
      meetingUrl: booking.meetingUrl,
      location: eventType.location,
    }),
  }).catch((err) => {
    emailLogger.error("Failed to send guest reschedule email", err, { bookingId: booking.id })
    return { error: err }
  })

  // Send to host
  const hostTimezone = host.timezone || "UTC"
  const hostOldTime = formatTimeRange(oldStartTime, oldEndTime, hostTimezone)
  const hostNewTime = formatTimeRange(booking.startTime, booking.endTime, hostTimezone)
  const hostResult = await client.emails.send({
    from: FROM_EMAIL,
    to: host.email,
    subject: `Rescheduled: ${eventType.title} with ${booking.guestName}`,
    react: BookingReschedule({
      recipientName: host.name || "Host",
      otherPartyName: booking.guestName,
      eventTitle: eventType.title,
      oldStartTime: hostOldTime.startTime,
      oldEndTime: hostOldTime.endTime,
      newStartTime: hostNewTime.startTime,
      newEndTime: hostNewTime.endTime,
      timezone: hostTimezone,
      rescheduledBy,
      isHost: true,
      bookingUrl,
      meetingUrl: booking.meetingUrl,
      location: eventType.location,
    }),
  }).catch((err) => {
    emailLogger.error("Failed to send host reschedule email", err, { bookingId: booking.id })
    return { error: err }
  })

  emailLogger.info("Reschedule emails sent", { bookingId: booking.id })
  return { success: true, guestResult, hostResult }
}

interface RescheduleRequestEmailData {
  booking: {
    id: string
    guestName: string
    guestEmail: string
    guestTimezone: string
    startTime: Date
    endTime: Date
  }
  eventType: {
    title: string
  }
  host: {
    name: string | null
    email: string
    timezone?: string
  }
  rescheduleUrl: string
}

export async function sendRescheduleRequestEmail(data: RescheduleRequestEmailData) {
  const { booking, eventType, host, rescheduleUrl } = data

  emailLogger.info("Sending reschedule request email to guest", {
    bookingId: booking.id,
    guestEmail: booking.guestEmail,
  })

  const client = await getResend()
  if (!client) {
    emailLogger.warn("Email client not available, skipping reschedule request email", { bookingId: booking.id })
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
      subject: `Reschedule Requested: ${eventType.title} with ${host.name || "Host"}`,
      react: RescheduleRequest({
        guestName: booking.guestName,
        hostName: host.name || "Host",
        eventTitle: eventType.title,
        startTime,
        endTime,
        timezone: booking.guestTimezone,
        rescheduleUrl,
      }),
    })

    emailLogger.info("Reschedule request email sent", {
      bookingId: booking.id,
      messageId: result.data?.id,
    })
    return { success: true, id: result.data?.id }
  } catch (error) {
    emailLogger.error("Failed to send reschedule request email", error, {
      bookingId: booking.id,
    })
    return { success: false, error }
  }
}
