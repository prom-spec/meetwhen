import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getDefaultWorkDays, getWorkDaysLabel, getCountryFromTimezone } from "@/lib/holidays"
import { apiLogger } from "@/lib/logger"

// GET /api/availability/defaults — returns default work days for user's timezone
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true, holidayCountry: true },
    })

    // Use stored timezone, but fall back to browser-detected timezone if stored is UTC (default)
    const browserTimezone = request.nextUrl.searchParams.get("browserTimezone")
    let tz = user?.timezone || "UTC"
    
    // If user's timezone is still the default "UTC" and browser provided a real timezone, use it
    // Also auto-save the detected timezone for future use
    if (tz === "UTC" && browserTimezone && browserTimezone !== "UTC") {
      tz = browserTimezone
      // Auto-save the detected timezone so it persists
      await prisma.user.update({
        where: { id: session.user.id },
        data: { timezone: browserTimezone },
      })
    }

    const country = user?.holidayCountry || getCountryFromTimezone(tz)
    const workDays = getDefaultWorkDays(tz)
    const label = getWorkDaysLabel(country)

    return NextResponse.json({ workDays, label, country, timezone: tz })
  } catch (error) {
    apiLogger.error("Error fetching defaults:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
