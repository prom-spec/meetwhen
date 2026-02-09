import { NextRequest, NextResponse } from "next/server"
import { getPublicHolidays, getCountryFromTimezone } from "@/lib/holidays"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const timezone = searchParams.get("timezone") || "UTC"
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10)
  const month = searchParams.get("month") // 0-indexed

  const country = getCountryFromTimezone(timezone)
  if (!country) {
    return NextResponse.json({ holidays: [] })
  }

  const holidays = month !== null
    ? getPublicHolidays(country, year, parseInt(month, 10))
    : getPublicHolidays(country, year)

  return NextResponse.json({ holidays, country })
}
