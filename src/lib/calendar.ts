import { google, calendar_v3 } from "googleapis"
import prisma from "./prisma"
import { calendarLogger } from "./logger"

export type LocationType = "IN_PERSON" | "GOOGLE_MEET" | "ZOOM" | "PHONE" | "CUSTOM"

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
    locationType: LocationType
    locationValue: string | null
  }
  host: {
    name: string | null
    email: string | null
  }
}

export interface CalendarEventResult {
  googleEventId: string | null
  meetingUrl: string | null
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
    calendarLogger.error("Error getting Google access token", error, { visitorId: userId })
    return null
  }
}

/**
 * Get the location string for calendar event based on location type
 */
function getEventLocation(booking: BookingData): string | undefined {
  const { locationType, locationValue, location } = booking.eventType
  
  switch (locationType) {
    case "IN_PERSON":
      return locationValue || location || undefined
    case "PHONE":
      return locationValue ? `Phone: ${locationValue}` : undefined
    case "ZOOM":
    case "CUSTOM":
      return locationValue || location || undefined
    case "GOOGLE_MEET":
      // Location will be set by conferenceData
      return undefined
    default:
      return location || undefined
  }
}

/**
 * Creates a Google Calendar event for a booking
 * Returns the Google Calendar event ID and meeting URL if successful
 */
export async function createCalendarEvent(
  accessToken: string,
  booking: BookingData
): Promise<CalendarEventResult> {
  try {
    const calendar = getGoogleCalendarClient(accessToken)
    const isGoogleMeet = booking.eventType.locationType === "GOOGLE_MEET"

    const event: calendar_v3.Schema$Event = {
      summary: `${booking.eventType.title} with ${booking.guestName}`,
      description: booking.eventType.description || undefined,
      location: getEventLocation(booking),
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
    }

    // Add Google Meet conference if requested
    if (isGoogleMeet) {
      event.conferenceData = {
        createRequest: {
          requestId: booking.id,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      }
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all",
      conferenceDataVersion: isGoogleMeet ? 1 : undefined,
    })

    const googleEventId = response.data.id || null
    let meetingUrl: string | null = null

    // Extract Google Meet URL from response
    if (isGoogleMeet && response.data.conferenceData?.entryPoints) {
      const videoEntry = response.data.conferenceData.entryPoints.find(
        (ep) => ep.entryPointType === "video"
      )
      meetingUrl = videoEntry?.uri || null
    }

    // For other location types with custom URLs, use that as the meeting URL
    if (!meetingUrl && (booking.eventType.locationType === "ZOOM" || booking.eventType.locationType === "CUSTOM")) {
      meetingUrl = booking.eventType.locationValue || null
    }

    calendarLogger.info("Created Google Calendar event", { googleEventId, hasMeetingUrl: !!meetingUrl, bookingId: booking.id })
    return { googleEventId, meetingUrl }
  } catch (error) {
    calendarLogger.error("Error creating Google Calendar event", error, { bookingId: booking.id })
    return { googleEventId: null, meetingUrl: null }
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
    calendarLogger.error("Error getting free/busy times", error)
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
    calendarLogger.error("Error getting free/busy times for user", error, { visitorId: userId })
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
    calendarLogger.error("Error checking calendar conflict", error, { visitorId: userId })
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

    calendarLogger.info("Deleted Google Calendar event", { eventId })
    return true
  } catch (error) {
    calendarLogger.error("Error deleting Google Calendar event", error, { eventId })
    return false
  }
}
