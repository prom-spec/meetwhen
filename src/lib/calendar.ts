import { google, calendar_v3 } from "googleapis"
import prisma from "./prisma"

export interface BookingData {
  id: string
  guestName: string
  guestEmail: string
  startTime: Date
  endTime: Date
  eventType: {
    title: string
    description: string | null
    location: string | null
  }
  host: {
    name: string | null
    email: string | null
  }
}

/**
 * Creates a Google Calendar API client with the given access token
 */
export function getGoogleCalendarClient(accessToken: string): calendar_v3.Calendar {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.calendar({ version: "v3", auth })
}

/**
 * Retrieves the Google access token for a user from the database
 * Handles token refresh if needed
 */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "google",
      },
    })

    if (!account?.access_token) {
      return null
    }

    // Check if token is expired and needs refresh
    const isExpired = account.expires_at && account.expires_at * 1000 < Date.now()

    if (isExpired && account.refresh_token) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )
      oauth2Client.setCredentials({ refresh_token: account.refresh_token })

      const { credentials } = await oauth2Client.refreshAccessToken()

      // Update the stored tokens
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : undefined,
        },
      })

      return credentials.access_token || null
    }

    return account.access_token
  } catch (error) {
    console.error("Error getting Google access token:", error)
    return null
  }
}

/**
 * Creates a Google Calendar event for a booking
 * Returns the Google Calendar event ID if successful, null otherwise
 */
export async function createCalendarEvent(
  accessToken: string,
  booking: BookingData
): Promise<string | null> {
  try {
    const calendar = getGoogleCalendarClient(accessToken)

    const event: calendar_v3.Schema$Event = {
      summary: `${booking.eventType.title} with ${booking.guestName}`,
      description: booking.eventType.description || undefined,
      location: booking.eventType.location || undefined,
      start: {
        dateTime: booking.startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: booking.endTime.toISOString(),
        timeZone: "UTC",
      },
      attendees: [
        { email: booking.guestEmail, displayName: booking.guestName },
        ...(booking.host.email ? [{ email: booking.host.email, displayName: booking.host.name || undefined }] : []),
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
      // Add conferencing if Google Meet is desired
      // conferenceData: { createRequest: { requestId: booking.id } },
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all", // Send email notifications to attendees
    })

    console.log(`Created Google Calendar event: ${response.data.id}`)
    return response.data.id || null
  } catch (error) {
    console.error("Error creating Google Calendar event:", error)
    return null
  }
}

/**
 * Gets free/busy information for a time range using access token
 * Returns busy time periods from the user's calendar
 */
export async function getFreeBusyTimesWithToken(
  accessToken: string,
  start: Date,
  end: Date
): Promise<{ start: Date; end: Date }[]> {
  try {
    const calendar = getGoogleCalendarClient(accessToken)

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: "primary" }],
      },
    })

    const busyTimes = response.data.calendars?.primary?.busy || []
    return busyTimes
      .filter((period) => period.start && period.end)
      .map((period) => ({
        start: new Date(period.start!),
        end: new Date(period.end!),
      }))
  } catch (error) {
    console.error("Error getting free/busy times:", error)
    return []
  }
}

/**
 * Gets free/busy information for a user (by userId)
 * Returns busy time periods from the user's calendar
 */
export async function getFreeBusyTimes(
  userId: string,
  start: Date,
  end: Date
): Promise<{ start: Date; end: Date }[]> {
  try {
    const accessToken = await getGoogleAccessToken(userId)
    if (!accessToken) {
      // No calendar connected
      return []
    }
    return getFreeBusyTimesWithToken(accessToken, start, end)
  } catch (error) {
    console.error("Error getting free/busy times:", error)
    return []
  }
}

/**
 * Checks if there's a calendar conflict for a given time range
 */
export async function hasCalendarConflict(
  userId: string,
  start: Date,
  end: Date
): Promise<boolean> {
  try {
    const busyTimes = await getFreeBusyTimes(userId, start, end)
    return busyTimes.length > 0
  } catch (error) {
    console.error("Error checking calendar conflict:", error)
    // On error, don't block booking
    return false
  }
}

/**
 * Deletes a Google Calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const calendar = getGoogleCalendarClient(accessToken)

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    })

    console.log(`Deleted Google Calendar event: ${eventId}`)
    return true
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error)
    return false
  }
}
