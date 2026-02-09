import Holidays from "date-holidays"
import { calendarLogger } from "./logger"

// Map timezone to country code for holiday lookups
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  "Asia/Jerusalem": "IL",
  "Asia/Tel_Aviv": "IL",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "Europe/London": "GB",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO",
  "Europe/Athens": "GR",
  "Europe/Istanbul": "TR",
  "Europe/Moscow": "RU",
  "Europe/Lisbon": "PT",
  "Europe/Dublin": "IE",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Singapore": "SG",
  "Asia/Kolkata": "IN",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Perth": "AU",
  "Pacific/Auckland": "NZ",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Sao_Paulo": "BR",
  "America/Mexico_City": "MX",
  "America/Argentina/Buenos_Aires": "AR",
  "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG",
  "Africa/Lagos": "NG",
}

/**
 * Get country code from timezone string
 */
export function getCountryFromTimezone(timezone: string): string | null {
  // Direct lookup
  if (TIMEZONE_TO_COUNTRY[timezone]) {
    return TIMEZONE_TO_COUNTRY[timezone]
  }

  // Try to extract country from timezone region
  // e.g., "America/New_York" → try common US cities
  const region = timezone.split("/")[0]
  if (region === "America") return "US" // fallback for Americas
  if (region === "Europe") return "GB" // fallback for Europe
  if (region === "Asia") return null // too diverse
  if (region === "Australia") return "AU"
  if (region === "Africa") return null

  return null
}

/**
 * Check if a specific date is a public holiday for the given timezone/country
 */
export function isPublicHoliday(date: Date, timezone: string): boolean {
  const country = getCountryFromTimezone(timezone)
  if (!country) return false

  try {
    const hd = new Holidays(country)
    const holidays = hd.isHoliday(date)

    if (!holidays || !Array.isArray(holidays)) return false

    // Only block on public holidays (type "public"), not observances
    return holidays.some((h: { type: string }) => h.type === "public")
  } catch (error) {
    calendarLogger.error("Error checking holidays", error, { timezone, country })
    return false
  }
}

/**
 * Get all public holidays for a given year (and optionally month) by country code or timezone.
 * If month is provided (0-indexed), filters to that month only.
 */
export function getPublicHolidays(
  countryOrTimezone: string,
  year: number,
  month?: number // 0-indexed, optional
): { date: string; name: string }[] {
  // Determine country code
  const country = countryOrTimezone.length === 2
    ? countryOrTimezone
    : getCountryFromTimezone(countryOrTimezone)
  if (!country) return []

  try {
    const hd = new Holidays(country)
    const allHolidays = hd.getHolidays(year)

    return allHolidays
      .filter((h: { type: string; date: string }) => {
        if (h.type !== "public") return false
        if (month !== undefined) {
          const hDate = new Date(h.date)
          return hDate.getMonth() === month
        }
        return true
      })
      .map((h: { date: string; name: string }) => ({
        date: h.date.substring(0, 10), // "YYYY-MM-DD"
        name: h.name,
      }))
  } catch (error) {
    calendarLogger.error("Error fetching holidays", error, { countryOrTimezone, country })
    return []
  }
}

/**
 * Get default work days based on timezone/country
 * Returns array of day-of-week numbers (0=Sunday, 6=Saturday)
 */
export function getDefaultWorkDays(timezone: string): number[] {
  const country = getCountryFromTimezone(timezone)

  // Countries with Sun-Thu work week
  const sunThuCountries = ["IL", "AE", "SA", "BH", "QA", "KW", "OM", "IQ", "YE", "JO", "SY", "LB", "PS"]

  if (country && sunThuCountries.includes(country)) {
    return [0, 1, 2, 3, 4] // Sun-Thu
  }

  // Default: Mon-Fri
  return [1, 2, 3, 4, 5]
}

/**
 * Get a human-readable label for the work week
 */
export function getWorkDaysLabel(countryOrTimezone: string | null): string {
  const country = countryOrTimezone && countryOrTimezone.length === 2
    ? countryOrTimezone
    : getCountryFromTimezone(countryOrTimezone || "UTC")

  const sunThuCountries = ["IL", "AE", "SA", "BH", "QA", "KW", "OM", "IQ", "YE", "JO", "SY", "LB", "PS"]

  if (country && sunThuCountries.includes(country)) {
    return "Sun–Thu"
  }
  return "Mon–Fri"
}

// Aliases
export const countryFromTimezone = getCountryFromTimezone
