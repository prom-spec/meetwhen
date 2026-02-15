import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listAllUserCalendars } from "@/lib/calendar"
import { apiLogger } from "@/lib/logger"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await listAllUserCalendars(session.user.id)
    return NextResponse.json(result)
  } catch (error: unknown) {
    apiLogger.error("Error fetching calendars:", error)
    const message = error instanceof Error ? error.message : ""
    if (message.includes("invalid_grant") || message.includes("Token has been expired") || message.includes("refresh token")) {
      return NextResponse.json({ 
        error: "Your Google calendar connection has expired. Please reconnect your Google account in Settings.", 
        code: "REAUTH_REQUIRED" 
      }, { status: 401 })
    }
    return NextResponse.json({ 
      error: "Unable to load calendars right now. Please try again in a moment.", 
      code: "FETCH_FAILED" 
    }, { status: 500 })
  }
}
