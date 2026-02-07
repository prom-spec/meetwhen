"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle, Users, RefreshCw, User } from "lucide-react"

interface EventType {
  id: string
  title: string
  duration: number
  description: string | null
  location: string | null
  schedulingType: string
}

interface Team {
  id: string
  name: string
  slug: string
}

interface SlotResponse {
  slots: string[]
  eventType: EventType
  team: Team
  hostTimezone: string
}

// Generate a simple session ID for funnel tracking
function getSessionId() {
  if (typeof window === "undefined") return null
  let sessionId = sessionStorage.getItem("booking_session_id")
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem("booking_session_id", sessionId)
  }
  return sessionId
}

// Track analytics event
async function trackEvent(eventTypeId: string, stage: string) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventTypeId,
        stage,
        sessionId: getSessionId(),
      }),
    })
  } catch (e) {
    console.debug("Analytics tracking failed:", e)
  }
}

export default function TeamBookingPage() {
  const params = useParams()
  const router = useRouter()
  const teamSlug = params.slug as string
  const eventSlug = params.eventSlug as string

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [, setHostTimezone] = useState<string>("UTC")
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [assignedHost, setAssignedHost] = useState<string | null>(null)
  const [guestTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const hasTrackedView = useRef(false)
  const hasTrackedSlot = useRef(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })

  useEffect(() => {
    if (eventType?.id && !hasTrackedView.current) {
      hasTrackedView.current = true
      trackEvent(eventType.id, "view")
    }
  }, [eventType?.id])

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const fetchSlots = async (date: Date) => {
    setIsLoading(true)
    try {
      const dateStr = formatDate(date)
      const res = await fetch(
        `/api/slots?teamSlug=${teamSlug}&eventSlug=${eventSlug}&date=${dateStr}&timezone=${guestTimezone}`
      )
      const data: SlotResponse = await res.json()
      setSlots(data.slots || [])
      setEventType(data.eventType)
      setTeam(data.team)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const data = await res.json()
        setBookingId(data.id || data.bookingIds?.[0])
        if (data.host?.name) {
          setAssignedHost(data.host.name)
        }
        setIsBooked(true)
        trackEvent(eventType.id, "booking_confirmed")
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

  const getSchedulingIcon = (schedulingType: string) => {
    switch (schedulingType) {
      case "ROUND_ROBIN":
        return <RefreshCw className="w-4 h-4" />
      case "COLLECTIVE":
        return <Users className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getSchedulingDescription = (schedulingType: string) => {
    switch (schedulingType) {
      case "ROUND_ROBIN":
        return "You'll be matched with an available team member"
      case "COLLECTIVE":
        return "All team members will join this meeting"
      default:
        return ""
    }
  }

  if (isBooked && eventType && selectedDate && selectedTime && team) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="py-4 px-4">
          <div className="max-w-md mx-auto">
            <Link href="/" className="inline-flex opacity-60 hover:opacity-100 transition-opacity">
              <Image
                src="/logo-full.svg"
                alt="MeetWhen"
                width={100}
                height={24}
              />
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-6">
              Your {eventType.title} with {team.name} has been scheduled.
              {assignedHost && eventType.schedulingType === "ROUND_ROBIN" && (
                <span className="block mt-1">You'll be meeting with <strong>{assignedHost}</strong>.</span>
              )}
              {eventType.schedulingType === "COLLECTIVE" && (
                <span className="block mt-1">All team members will attend.</span>
              )}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <p className="font-semibold text-[#1a1a2e]">{eventType.title}</p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-sm text-gray-500">{selectedTime} ({guestTimezone})</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              A confirmation email has been sent to {formData.email}
            </p>
            {bookingId && (
              <Link
                href={`/booking/${bookingId}`}
                className="inline-flex items-center justify-center w-full py-3 px-4 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052cc] transition-colors"
              >
                View Booking Details
              </Link>
            )}
          </div>
        </main>

        <footer className="py-6 text-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#0066FF] transition-colors"
          >
            <Image
              src="/logo.svg"
              alt="MeetWhen"
              width={16}
              height={16}
              className="opacity-50"
            />
            <span>Powered by <span className="font-semibold">MeetWhen</span></span>
          </Link>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="py-4 px-4 border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex opacity-60 hover:opacity-100 transition-opacity">
            <Image
              src="/logo-full.svg"
              alt="MeetWhen"
              width={100}
              height={24}
            />
          </Link>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="md:flex">
              {/* Left side - Event info */}
              <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
                <button
                  onClick={() => router.push(`/team/${teamSlug}`)}
                  className="text-sm text-[#0066FF] hover:text-[#0052cc] mb-4 font-medium"
                >
                  ← Back
                </button>
                {eventType && team ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-gray-600">{team.name}</span>
                    </div>
                    <h1 className="text-xl font-bold text-[#1a1a2e]">{eventType.title}</h1>
                    
                    {/* Scheduling Type Badge */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-full font-medium">
                        {getSchedulingIcon(eventType.schedulingType)}
                        {eventType.schedulingType === "ROUND_ROBIN" ? "Round Robin" : "Collective"}
                      </span>
                    </div>
                    {eventType.schedulingType && (
                      <p className="text-xs text-gray-500 mt-2">
                        {getSchedulingDescription(eventType.schedulingType)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-4 text-gray-500">
                      <Clock className="w-4 h-4 text-[#0066FF]" />
                      <span>{eventType.duration} min</span>
                    </div>
                    {eventType.location && (
                      <div className="flex items-center gap-2 mt-2 text-gray-500">
                        <MapPin className="w-4 h-4 text-[#0066FF]" />
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
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h2 className="font-semibold text-[#1a1a2e]">
                          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h2>
                        <button
                          onClick={() =>
                            setCurrentMonth(
                              new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                            )
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-600" />
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
                                py-2 rounded-full text-sm transition-colors
                                ${disabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-blue-50"}
                                ${selected ? "bg-[#0066FF] text-white hover:bg-[#0052cc]" : ""}
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
                      <div className="md:w-44">
                        <h3 className="font-medium mb-3 text-sm text-[#1a1a2e]">
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
                                  if (eventType?.id && !hasTrackedSlot.current) {
                                    hasTrackedSlot.current = true
                                    trackEvent(eventType.id, "slot_selected")
                                  }
                                }}
                                className={`
                                  w-full py-2.5 px-3 text-sm border rounded-lg font-medium transition-colors
                                  ${
                                    selectedTime === slot
                                      ? "border-[#0066FF] bg-blue-50 text-[#0066FF]"
                                      : "border-gray-200 hover:border-[#0066FF] hover:text-[#0066FF]"
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
                      className="text-sm text-[#0066FF] hover:text-[#0052cc] mb-4 font-medium"
                    >
                      ← Change time
                    </button>
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="font-semibold text-[#1a1a2e]">{eventType?.title}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedDate?.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                        {" at "}{selectedTime}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{guestTimezone}</p>
                      {eventType?.schedulingType && (
                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                          {getSchedulingIcon(eventType.schedulingType)}
                          {getSchedulingDescription(eventType.schedulingType)}
                        </p>
                      )}
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
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-shadow"
                          placeholder="John Smith"
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
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-shadow"
                          placeholder="john@example.com"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-[#0066FF] text-white font-medium rounded-lg hover:bg-[#0052cc] disabled:opacity-50 transition-colors"
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
      </main>

      <footer className="py-6 text-center border-t border-gray-100">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#0066FF] transition-colors"
        >
          <Image
            src="/logo.svg"
            alt="MeetWhen"
            width={16}
            height={16}
            className="opacity-50"
          />
          <span>Powered by <span className="font-semibold">MeetWhen</span></span>
        </Link>
      </footer>
    </div>
  )
}
