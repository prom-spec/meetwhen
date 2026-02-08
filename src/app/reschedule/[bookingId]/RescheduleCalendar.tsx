"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Clock, MapPin, Loader2 } from "lucide-react"
import * as dateFns from "date-fns"

interface RescheduleCalendarProps {
  bookingId: string
  token: string
  guestTimezone: string
  eventType: {
    id: string
    title: string
    duration: number
    description: string | null
    location: string | null
    maxDaysAhead: number
  }
  host: {
    name: string | null
    username: string | null
    timezone: string
  }
}

export default function RescheduleCalendar({
  bookingId,
  token,
  guestTimezone,
  eventType,
  host,
}: RescheduleCalendarProps) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const maxDate = dateFns.addDays(today, eventType.maxDaysAhead)

  // Fetch available slots when date is selected
  const fetchSlots = useCallback(async (date: Date) => {
    setIsLoadingSlots(true)
    setSlots([])
    setSelectedTime(null)
    setError(null)

    try {
      const dateStr = dateFns.format(date, "yyyy-MM-dd")
      const response = await fetch(
        `/api/bookings/${bookingId}/reschedule?date=${dateStr}&token=${token}`
      )
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to fetch available times")
      }

      const data = await response.json()
      setSlots(data.slots || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load times")
    } finally {
      setIsLoadingSlots(false)
    }
  }, [bookingId, token])

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate)
    }
  }, [selectedDate, fetchSlots])

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return

    setIsSubmitting(true)
    setError(null)

    try {
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const startTime = dateFns.setMinutes(
        dateFns.setHours(selectedDate, hours),
        minutes
      )

      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          token,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to reschedule booking")
      }

      // Redirect to booking confirmation page
      router.push(`/booking/${bookingId}?token=${token}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule")
      setIsSubmitting(false)
    }
  }

  // Calendar helpers
  const daysInMonth = dateFns.eachDayOfInterval({
    start: dateFns.startOfWeek(dateFns.startOfMonth(currentMonth)),
    end: dateFns.endOfWeek(dateFns.endOfMonth(currentMonth)),
  })

  const isDateDisabled = (date: Date) => {
    return (
      dateFns.isBefore(date, dateFns.startOfDay(today)) ||
      dateFns.isAfter(date, maxDate)
    )
  }

  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes)
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Left: Event Info + Calendar */}
      <div>
        {/* Event Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-lg text-[#1a1a2e] mb-4">{eventType.title}</h2>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{eventType.duration} minutes</span>
            </div>
            {eventType.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{eventType.location}</span>
              </div>
            )}
          </div>
          
          {eventType.description && (
            <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
              {eventType.description}
            </p>
          )}
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(dateFns.subMonths(currentMonth, 1))}
              disabled={dateFns.isSameMonth(currentMonth, today)}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-[#1a1a2e]">
              {dateFns.format(currentMonth, "MMMM yyyy")}
            </h3>
            <button
              onClick={() => setCurrentMonth(dateFns.addMonths(currentMonth, 1))}
              disabled={dateFns.isAfter(dateFns.startOfMonth(dateFns.addMonths(currentMonth, 1)), maxDate)}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((date) => {
              const isCurrentMonth = dateFns.isSameMonth(date, currentMonth)
              const isDisabled = isDateDisabled(date)
              const isSelected = selectedDate && dateFns.isSameDay(date, selectedDate)
              const isToday = dateFns.isSameDay(date, today)

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => !isDisabled && setSelectedDate(date)}
                  disabled={isDisabled || !isCurrentMonth}
                  className={`
                    aspect-square p-2 text-sm rounded-lg transition-colors
                    ${!isCurrentMonth ? "text-gray-300 cursor-default" : ""}
                    ${isDisabled && isCurrentMonth ? "text-gray-300 cursor-not-allowed" : ""}
                    ${!isDisabled && isCurrentMonth && !isSelected ? "hover:bg-gray-100 text-gray-900" : ""}
                    ${isSelected ? "bg-[#0066FF] text-white" : ""}
                    ${isToday && !isSelected ? "ring-1 ring-[#0066FF] ring-inset" : ""}
                  `}
                >
                  {dateFns.format(date, "d")}
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center">
            Times shown in {guestTimezone.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {/* Right: Time Slots */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-[#1a1a2e] mb-4">
          {selectedDate
            ? dateFns.format(selectedDate, "EEEE, MMMM d")
            : "Select a date"}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {!selectedDate && (
          <p className="text-gray-500 text-sm">
            Please select a date to see available times
          </p>
        )}

        {selectedDate && isLoadingSlots && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#0066FF]" />
          </div>
        )}

        {selectedDate && !isLoadingSlots && slots.length === 0 && (
          <p className="text-gray-500 text-sm">
            No available times on this date. Please select another date.
          </p>
        )}

        {selectedDate && !isLoadingSlots && slots.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {slots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`
                    py-3 px-4 text-sm font-medium rounded-lg border transition-colors
                    ${selectedTime === time
                      ? "bg-[#0066FF] text-white border-[#0066FF]"
                      : "border-gray-200 hover:border-[#0066FF] hover:text-[#0066FF]"
                    }
                  `}
                >
                  {formatTimeForDisplay(time)}
                </button>
              ))}
            </div>

            {selectedTime && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="mt-6 w-full py-3 px-4 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rescheduling...
                  </>
                ) : (
                  "Confirm New Time"
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
