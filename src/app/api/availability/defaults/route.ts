import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getDefaultWorkDays, getWorkDaysLabel, getCountryFromTimezone } from "@/lib/holidays"

// GET /api/availability/defaults — returns default work days for user's timezone
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true, holidayCountry: true },
    })

    const tz = user?.timezone || "UTC"
    const country = user?.holidayCountry || getCountryFromTimezone(tz)
    const workDays = getDefaultWorkDays(tz)
    const label = getWorkDaysLabel(country)

    return NextResponse.json({ workDays, label, country, timezone: tz })
  } catch (error) {
    console.error("Error fetching defaults:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
