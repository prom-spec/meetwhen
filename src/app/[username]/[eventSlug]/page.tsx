"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle } from "lucide-react"

interface EventType {
  id: string
  title: string
  duration: number
  description: string | null
  location: string | null
}

interface SlotResponse {
  slots: string[]
  eventType: EventType
  hostTimezone: string
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const eventSlug = params.eventSlug as string

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [hostTimezone, setHostTimezone] = useState<string>("UTC")
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const [guestTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const fetchSlots = async (date: Date) => {
    setIsLoading(true)
    try {
      const dateStr = formatDate(date)
      const res = await fetch(
        `/api/slots?username=${username}&eventSlug=${eventSlug}&date=${dateStr}&timezone=${guestTimezone}`
      )
      const data: SlotResponse = await res.json()
      setSlots(data.slots || [])
      setEventType(data.eventType)
      setHostTimezone(data.hostTimezone)
    } catch (error) {
      console.error("Error fetching slots:", error)
      setSlots([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate)
      setSelectedTime(null)
      setShowForm(false)
    }
  }, [selectedDate])

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime || !eventType) return

    setIsLoading(true)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeId: eventType.id,
          guestName: formData.name,
          guestEmail: formData.email,
          guestTimezone,
          date: formatDate(selectedDate),
          time: selectedTime,
        }),
      })

      if (res.ok) {
        setIsBooked(true)
      } else {
        const error = await res.json()
        alert(error.error || "Failed to book")
      }
    } catch (error) {
      console.error("Error booking:", error)
      alert("Failed to book")
    } finally {
      setIsLoading(false)
    }
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay }
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date < today
  }

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    )
  }

  if (isBooked && eventType && selectedDate && selectedTime) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Your {eventType.title} with {username} has been scheduled.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
            <p className="font-medium">{eventType.title}</p>
            <p className="text-sm text-gray-500">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="text-sm text-gray-500">{selectedTime} ({guestTimezone})</p>
          </div>
          <p className="text-sm text-gray-500">
            A confirmation email has been sent to {formData.email}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:flex">
            {/* Left side - Event info */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-gray-200">
              <button
                onClick={() => router.push(`/${username}`)}
                className="text-sm text-blue-600 hover:text-blue-700 mb-4"
              >
                ← Back
              </button>
              {eventType ? (
                <>
                  <h1 className="text-xl font-bold text-gray-900">{eventType.title}</h1>
                  <div className="flex items-center gap-2 mt-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{eventType.duration} min</span>
                  </div>
                  {eventType.location && (
                    <div className="flex items-center gap-2 mt-1 text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{eventType.location}</span>
                    </div>
                  )}
                  {eventType.description && (
                    <p className="mt-4 text-gray-600 text-sm">{eventType.description}</p>
                  )}
                </>
              ) : (
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              )}
            </div>

            {/* Right side - Calendar and slots */}
            <div className="md:w-2/3 p-6">
              {!showForm ? (
                <div className="md:flex gap-6">
                  {/* Calendar */}
                  <div className="flex-1 mb-6 md:mb-0">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                          )
                        }
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h2 className="font-semibold">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h2>
                      <button
                        onClick={() =>
                          setCurrentMonth(
                            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                          )
                        }
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {dayNames.map((day) => (
                        <div key={day} className="py-2 text-gray-500 font-medium">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: startingDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const disabled = isDateDisabled(day)
                        const selected = isDateSelected(day)
                        return (
                          <button
                            key={day}
                            onClick={() => {
                              if (!disabled) {
                                setSelectedDate(
                                  new Date(
                                    currentMonth.getFullYear(),
                                    currentMonth.getMonth(),
                                    day
                                  )
                                )
                              }
                            }}
                            disabled={disabled}
                            className={`
                              py-2 rounded-full text-sm
                              ${disabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-blue-50"}
                              ${selected ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                            `}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Time slots */}
                  {selectedDate && (
                    <div className="md:w-40">
                      <h3 className="font-medium mb-3 text-sm">
                        {selectedDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </h3>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {isLoading ? (
                          <div className="text-sm text-gray-500">Loading...</div>
                        ) : slots.length === 0 ? (
                          <div className="text-sm text-gray-500">No available times</div>
                        ) : (
                          slots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => {
                                setSelectedTime(slot)
                                setShowForm(true)
                              }}
                              className={`
                                w-full py-2 px-3 text-sm border rounded-lg
                                ${
                                  selectedTime === slot
                                    ? "border-blue-600 bg-blue-50 text-blue-600"
                                    : "border-gray-200 hover:border-blue-600"
                                }
                              `}
                            >
                              {slot}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Booking Form */
                <div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-sm text-blue-600 hover:text-blue-700 mb-4"
                  >
                    ← Change time
                  </button>
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium">{eventType?.title}</p>
                    <p className="text-sm text-gray-500">
                      {selectedDate?.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                      {" at "}{selectedTime}
                    </p>
                    <p className="text-xs text-gray-400">{guestTimezone}</p>
                  </div>
                  <form onSubmit={handleBook} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? "Booking..." : "Confirm Booking"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
