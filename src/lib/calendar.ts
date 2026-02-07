import { google, calendar_v3 } from "googleapis"
import prisma from "./prisma"

/**
 * Get an authenticated Google Calendar client for a user
 */
async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  })

  if (!account?.access_token) {
    return null
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  })

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
          ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
        },
      })
    }
  })

  return google.calendar({ version: "v3", auth: oauth2Client })
}

/**
 * Get busy times from Google Calendar for a user within a date range
 */
export async function getFreeBusyTimes(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ start: Date; end: Date }[]> {
  const calendar = await getCalendarClient(userId)

  if (!calendar) {
    console.log(`No Google Calendar access for user ${userId}`)
    return []
  }

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: "primary" }],
      },
    })

    const busyTimes = response.data.calendars?.primary?.busy || []

    return busyTimes.map((slot) => ({
      start: new Date(slot.start!),
      end: new Date(slot.end!),
    }))
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string }
    console.error("Error fetching free/busy times:", err.message)
    
    // If it's an auth error, the user may need to re-authenticate
    if (err.code === 401 || err.code === 403) {
      console.log(`Calendar access revoked or expired for user ${userId}`)
    }
    
    return []
  }
}

/**
 * Check if a specific time slot conflicts with Google Calendar events
 */
export async function hasCalendarConflict(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const busyTimes = await getFreeBusyTimes(userId, startTime, endTime)

  return busyTimes.some(
    (busy) => busy.start < endTime && busy.end > startTime
  )
}

interface BookingDetails {
  id: string
  title: string
  description?: string | null
  startTime: Date
  endTime: Date
  guestName: string
  guestEmail: string
  location?: string | null
  hostTimezone?: string
}

/**
 * Create a calendar event for a booking
 */
export async function createCalendarEvent(
  userId: string,
  booking: BookingDetails
): Promise<string | null> {
  const calendar = await getCalendarClient(userId)

  if (!calendar) {
    console.log(`No Google Calendar access for user ${userId}`)
    return null
  }

  try {
    const event: calendar_v3.Schema$Event = {
      summary: `${booking.title} with ${booking.guestName}`,
      description: booking.description || `Booking with ${booking.guestName} (${booking.guestEmail})`,
      start: {
        dateTime: booking.startTime.toISOString(),
        timeZone: booking.hostTimezone || "UTC",
      },
      end: {
        dateTime: booking.endTime.toISOString(),
        timeZone: booking.hostTimezone || "UTC",
      },
      attendees: [{ email: booking.guestEmail, displayName: booking.guestName }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    }

    if (booking.location) {
      event.location = booking.location
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all", // Send email invites to attendees
    })

    const eventId = response.data.id || null

    // Update booking with Google Event ID
    if (eventId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          googleEventId: eventId,
          meetingUrl: response.data.hangoutLink || null,
        },
      })
    }

    return eventId
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string }
    console.error("Error creating calendar event:", err.message)
    return null
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  userId: string,
  googleEventId: string
): Promise<boolean> {
  const calendar = await getCalendarClient(userId)

  if (!calendar) {
    return false
  }

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
      sendUpdates: "all",
    })
    return true
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error("Error deleting calendar event:", err.message)
    return false
  }
}

/**
 * Update a calendar event when booking is modified
 */
export async function updateCalendarEvent(
  userId: string,
  googleEventId: string,
  updates: Partial<BookingDetails>
): Promise<boolean> {
  const calendar = await getCalendarClient(userId)

  if (!calendar) {
    return false
  }

  try {
    const event: calendar_v3.Schema$Event = {}

    if (updates.title && updates.guestName) {
      event.summary = `${updates.title} with ${updates.guestName}`
    }
    if (updates.description) {
      event.description = updates.description
    }
    if (updates.startTime) {
      event.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: updates.hostTimezone || "UTC",
      }
    }
    if (updates.endTime) {
      event.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: updates.hostTimezone || "UTC",
      }
    }
    if (updates.location) {
      event.location = updates.location
    }

    await calendar.events.patch({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: event,
      sendUpdates: "all",
    })

    return true
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error("Error updating calendar event:", err.message)
    return false
  }
}
