"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Globe, Loader2 } from "lucide-react"

interface BookingCalendarProps {
  username: string
  eventSlug: string
  eventTypeId: string
  duration: number
  maxDaysAhead: number
}

// Slots from API are "HH:mm" strings; we convert to ISO when needed
type TimeSlot = string // "HH:mm"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export default function BookingCalendar({
  username,
  eventSlug,
  eventTypeId,
  duration: _duration,
  maxDaysAhead,
}: BookingCalendarProps) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [timezone, setTimezone] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [holidays, setHolidays] = useState<Record<string, string>>({}) // date -> name

  // Fetch holidays when month or timezone changes
  useEffect(() => {
    if (!timezone) return
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    fetch(`/api/holidays?timezone=${timezone}&year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, string> = {}
        for (const h of data.holidays || []) {
          map[h.date] = h.name
        }
        setHolidays(map)
      })
      .catch(() => setHolidays({}))
  }, [currentMonth, timezone])

  // Get all available timezones
  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone")
    } catch {
      // Fallback for browsers that don't support supportedValuesOf
      return [
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Toronto",
        "America/Vancouver",
        "America/Sao_Paulo",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Europe/Moscow",
        "Asia/Dubai",
        "Asia/Kolkata",
        "Asia/Singapore",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Asia/Jerusalem",
        "Australia/Sydney",
        "Pacific/Auckland",
      ]
    }
  }, [])

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  useEffect(() => {
    if (selectedDate && timezone) {
      fetchSlots(selectedDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, timezone])

  const fetchSlots = async (date: Date) => {
    setIsLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    
    try {
      const res = await fetch(
        `/api/slots?username=${username}&eventSlug=${eventSlug}&date=${dateStr}&timezone=${timezone}`
      )
      const data = await res.json()
      setSlots(data.slots || [])
    } catch (err) {
      console.error("Error fetching slots:", err)
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) return

    setIsSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeId,
          guestName: formData.name,
          guestEmail: formData.email,
          guestTimezone: timezone,
          date: selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}` : undefined,
          time: selectedSlot,
          notes: formData.notes || "",
        }),
      })

      if (res.ok) {
        const booking = await res.json()
        router.push(`/booking/${booking.id}`)
      } else {
        const data = await res.json()
        setError(data.error || "Failed to create booking")
      }
    } catch {
      setError("Unable to complete your booking. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    return { daysInMonth, startingDay }
  }

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + maxDaysAhead)
    
    return date < today || date > maxDate
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth)

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    setSelectedDate(null)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  // formatTime no longer needed — slots are already "HH:mm" strings

  if (showForm && selectedSlot) {
    return (
      <div>
        <button
          onClick={() => setShowForm(false)}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Confirm your booking</h2>
          <p className="text-sm text-gray-600 mt-1">
            {selectedDate?.toLocaleDateString(undefined, { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}
            {" at "}
            {selectedSlot}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Additional notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              placeholder="Share anything that will help prepare for our meeting..."
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-md">
            <Globe className="w-4 h-4" />
            <span>Times shown in {timezone.replace(/_/g, " ")}</span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-[#0066FF] text-white rounded-md font-medium hover:bg-[#0052cc] disabled:opacity-50"
          >
            {isSubmitting ? "Scheduling..." : "Schedule Event"}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Date & Time</h2>
      
      {/* Timezone Selector */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          <Globe className="w-4 h-4" />
          Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-2"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="font-medium text-gray-900">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-full"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {Array.from({ length: startingDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const isSelected = selectedDate?.toDateString() === date.toDateString()
          const disabled = isDateDisabled(day)
          const holidayName = holidays[dateStr]
          const isHoliday = !!holidayName
          
          return (
            <button
              key={day}
              onClick={() => !disabled && !isHoliday && setSelectedDate(date)}
              disabled={disabled || isHoliday}
              title={holidayName || undefined}
              aria-label={`${date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${holidayName ? ` (${holidayName})` : ""}`}
              className={`
                aspect-square flex flex-col items-center justify-center text-sm rounded-full relative
                ${disabled || isHoliday
                  ? isHoliday
                    ? "text-red-400 cursor-not-allowed"
                    : "text-gray-400 cursor-not-allowed" 
                  : isSelected
                    ? "bg-[#0066FF] text-white"
                    : "hover:bg-gray-100 text-gray-900"
                }
              `}
            >
              {day}
              {isHoliday && (
                <span className="absolute bottom-0.5 w-1 h-1 bg-red-400 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {selectedDate.toLocaleDateString(undefined, { 
              weekday: "long", 
              month: "long", 
              day: "numeric" 
            })}
          </h4>
          
          {isLoadingSlots ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading available times...
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-500">No available times on this day</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => {
                    setSelectedSlot(slot)
                    setShowForm(true)
                  }}
                  className="py-2 px-3 text-sm border border-[#0066FF] text-[#0066FF] rounded-md hover:bg-blue-50 focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2"
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
