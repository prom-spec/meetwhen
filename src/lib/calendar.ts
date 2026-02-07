import { google, calendar_v3 } from "googleapis"
import { prisma } from "./prisma"

/**
 * Get the Google OAuth2 access token for a user from their account
 */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  })

  if (!account?.access_token) {
    return null
  }

  // Check if token is expired and needs refresh
  if (account.expires_at && account.refresh_token) {
    const expiresAt = account.expires_at * 1000 // Convert to milliseconds
    const now = Date.now()
    
    if (now >= expiresAt - 60000) { // Refresh if expires within 1 minute
      const refreshedToken = await refreshAccessToken(userId, account.refresh_token)
      return refreshedToken
    }
  }

  return account.access_token
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    if (credentials.access_token) {
      // Update the stored token
      await prisma.account.updateMany({
        where: {
          userId,
          provider: "google",
        },
        data: {
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date 
            ? Math.floor(credentials.expiry_date / 1000) 
            : undefined,
        },
      })
      
      return credentials.access_token
    }
    
    return null
  } catch (error) {
    console.error("Failed to refresh access token:", error)
    return null
  }
}

/**
 * Create a Google Calendar client with the user's access token
 */
export function getGoogleCalendarClient(accessToken: string): calendar_v3.Calendar {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  
  oauth2Client.setCredentials({ access_token: accessToken })
  
  return google.calendar({ version: "v3", auth: oauth2Client })
}

/**
 * Booking data for calendar event creation
 */
export interface BookingForCalendar {
  id: string
  title: string
  description?: string | null
  startTime: Date
  endTime: Date
  guestName: string
  guestEmail: string
  location?: string | null
  hostTimezone?: string | null
}

/**
 * Create a Google Calendar event for a booking
 * @param userId - The host's user ID
 * @param booking - Booking details
 */
export async function createCalendarEvent(
  userId: string,
  booking: BookingForCalendar
): Promise<string | null> {
  try {
    const accessToken = await getGoogleAccessToken(userId)
    if (!accessToken) {
      console.log("No Google access token found for user, skipping calendar event")
      return null
    }
    
    const calendar = getGoogleCalendarClient(accessToken)
    
    const event: calendar_v3.Schema$Event = {
      summary: `${booking.title} with ${booking.guestName}`,
      description: booking.description || undefined,
      location: booking.location || undefined,
      start: {
        dateTime: booking.startTime.toISOString(),
        timeZone: booking.hostTimezone || "UTC",
      },
      end: {
        dateTime: booking.endTime.toISOString(),
        timeZone: booking.hostTimezone || "UTC",
      },
      attendees: [
        { email: booking.guestEmail, displayName: booking.guestName },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    }
    
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all", // Send invitation emails to attendees
    })
    
    const googleEventId = response.data.id || null
    
    // Update booking with Google event ID
    if (googleEventId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { googleEventId },
      })
    }
    
    return googleEventId
  } catch (error) {
    console.error("Failed to create calendar event:", error)
    return null
  }
}

/**
 * Get free/busy times from Google Calendar
 * @param userId - The user ID to fetch calendar for
 * @param timeMin - Start of time range
 * @param timeMax - End of time range
 */
export async function getFreeBusyTimes(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<Array<{ start: Date; end: Date }>> {
  try {
    const accessToken = await getGoogleAccessToken(userId)
    if (!accessToken) {
      return []
    }
    
    const calendar = getGoogleCalendarClient(accessToken)
    
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: "primary" }],
      },
    })
    
    const busyTimes = response.data.calendars?.primary?.busy || []
    
    return busyTimes
      .filter((slot): slot is { start: string; end: string } => 
        !!slot.start && !!slot.end
      )
      .map((slot) => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
      }))
  } catch (error) {
    console.error("Failed to get free/busy times:", error)
    return []
  }
}

/**
 * Check if there's a calendar conflict for the given time range
 */
export async function hasCalendarConflict(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const busyTimes = await getFreeBusyTimes(userId, startTime, endTime)
  return busyTimes.some(
    (busy) => startTime < busy.end && endTime > busy.start
  )
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  try {
    const accessToken = await getGoogleAccessToken(userId)
    if (!accessToken) {
      return false
    }
    
    const calendar = getGoogleCalendarClient(accessToken)
    
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    })
    
    return true
  } catch (error) {
    console.error("Failed to delete calendar event:", error)
    return false
  }
}
