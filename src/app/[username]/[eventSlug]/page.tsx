"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle, Globe, Search, Loader2, Repeat } from "lucide-react"
import PoweredByFooter from "@/components/PoweredByFooter"
import { useToast } from "@/components/ToastProvider"

interface ScreeningQuestion {
  id: string
  label: string
  type: "text" | "select" | "checkbox"
  required: boolean
  options?: string[]
}

interface EventType {
  id: string
  title: string
  duration: number
  description: string | null
  location: string | null
  allowRecurring?: boolean
  recurrenceOptions?: string | null
  maxAttendees?: number
  screeningQuestions?: string | null
  cancellationPolicy?: string | null
  confirmationLinks?: string | null
  redirectUrl?: string | null
}

interface Branding {
  brandColor: string | null
  accentColor: string | null
  brandLogo: string | null
  hidePoweredBy: boolean
  gaTrackingId: string | null
  metaPixelId: string | null
}

interface SlotResponse {
  slots: string[]
  spotsLeft?: Record<string, number>
  maxAttendees?: number
  eventType: EventType
  hostName?: string
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

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const username = params.username as string
  const eventSlug = params.eventSlug as string
  const isEmbed = searchParams.get("embed") === "true"

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [hostName, setHostName] = useState<string>("")
  const [, setHostTimezone] = useState<string>("UTC")
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [guestTimezone, setGuestTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [showTimezoneSelector, setShowTimezoneSelector] = useState(false)
  const [timezoneSearch, setTimezoneSearch] = useState("")
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [isLoadingMonth, setIsLoadingMonth] = useState(false)
  const [branding, setBranding] = useState<Branding>({ brandColor: null, accentColor: null, brandLogo: null, hidePoweredBy: false, gaTrackingId: null, metaPixelId: null })
  const hasTrackedView = useRef(false)
  const hasTrackedSlot = useRef(false)
  const hasAutoSelected = useRef(false)
  const tzDropdownRef = useRef<HTMLDivElement>(null)

  const { toast } = useToast()
  const [spotsLeft, setSpotsLeft] = useState<Record<string, number>>({})
  const [bookForOther, setBookForOther] = useState(false)
  const [bookerName, setBookerName] = useState("")
  const [bookerEmail, setBookerEmail] = useState("")
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    notes: "",
    recurrenceRule: "",
  })

  const allTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone")
    } catch {
      return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
        "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
        "Asia/Kolkata", "Asia/Jerusalem", "Australia/Sydney", "Pacific/Auckland"]
    }
  }, [])

  const filteredTimezones = useMemo(() => {
    if (!timezoneSearch) return allTimezones
    const q = timezoneSearch.toLowerCase()
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q))
  }, [allTimezones, timezoneSearch])

  // Close timezone dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target as Node)) {
        setShowTimezoneSelector(false)
        setTimezoneSearch("")
      }
    }
    if (showTimezoneSelector) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showTimezoneSelector])

  // Fetch host branding
  useEffect(() => {
    fetch(`/api/branding?username=${username}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setBranding(data) })
      .catch(() => {})
  }, [username])

  const accent = branding.brandColor || "#0066FF"
  const accentHover = branding.brandColor ? branding.brandColor + "dd" : "#0052cc"

  // Inject GA / Meta Pixel tracking scripts
  useEffect(() => {
    if (!branding.gaTrackingId && !branding.metaPixelId) return
    const head = document.head

    if (branding.gaTrackingId) {
      const gaScript = document.createElement("script")
      gaScript.async = true
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${branding.gaTrackingId}`
      head.appendChild(gaScript)
      const gaInline = document.createElement("script")
      gaInline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${branding.gaTrackingId}');`
      head.appendChild(gaInline)
    }

    if (branding.metaPixelId) {
      const fbScript = document.createElement("script")
      fbScript.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${branding.metaPixelId}');fbq('track','PageView');`
      head.appendChild(fbScript)
    }
  }, [branding.gaTrackingId, branding.metaPixelId])

  // Apply custom CSS variables for brand/accent colors
  useEffect(() => {
    if (branding.brandColor) document.documentElement.style.setProperty('--brand-color', branding.brandColor)
    if (branding.accentColor) document.documentElement.style.setProperty('--accent-color', branding.accentColor)
    return () => {
      document.documentElement.style.removeProperty('--brand-color')
      document.documentElement.style.removeProperty('--accent-color')
    }
  }, [branding.brandColor, branding.accentColor])

  // Track page view once when event type is loaded
  useEffect(() => {
    if (eventType?.id && !hasTrackedView.current) {
      hasTrackedView.current = true
      trackEvent(eventType.id, "view")
    }
  }, [eventType?.id])

  const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  const fetchSlots = useCallback(async (date: Date) => {
    setIsLoading(true)
    try {
      const dateStr = formatDate(date)
      const res = await fetch(
        `/api/slots?username=${username}&eventSlug=${eventSlug}&date=${dateStr}&timezone=${guestTimezone}`
      )
      const data: SlotResponse = await res.json()
      setSlots(data.slots || [])
      setSpotsLeft(data.spotsLeft || {})
      setEventType(data.eventType)
      if (data.hostName) setHostName(data.hostName)
      setHostTimezone(data.hostTimezone)
    } catch (error) {
      console.error("Error fetching slots:", error)
      setSlots([])
    } finally {
      setIsLoading(false)
    }
  }, [username, eventSlug, guestTimezone])

  // Fetch month availability
  const fetchMonthAvailability = useCallback(async (monthDate: Date) => {
    setIsLoadingMonth(true)
    try {
      const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`
      const res = await fetch(
        `/api/slots/month?username=${username}&eventSlug=${eventSlug}&month=${monthStr}`
      )
      const data = await res.json()
      setAvailableDates(new Set(data.availableDates || []))
    } catch {
      setAvailableDates(new Set())
    } finally {
      setIsLoadingMonth(false)
    }
  }, [username, eventSlug])

  // Fetch month availability when month changes
  useEffect(() => {
    fetchMonthAvailability(currentMonth)
  }, [currentMonth, fetchMonthAvailability])

  // Auto-select today on initial load
  useEffect(() => {
    if (!hasAutoSelected.current) {
      hasAutoSelected.current = true
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      setSelectedDate(today)
    }
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate)
      setSelectedTime(null)
      setShowForm(false)
    }
  }, [selectedDate, fetchSlots])

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
          notes: formData.notes || "",
          ...(formData.recurrenceRule ? { recurrenceRule: formData.recurrenceRule } : {}),
          ...(Object.keys(screeningAnswers).length > 0 ? { screeningAnswers: JSON.stringify(screeningAnswers) } : {}),
          ...(bookForOther ? { bookedByName: bookerName, bookedByEmail: bookerEmail } : {}),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setBookingId(data.id)
        setIsBooked(true)
        trackEvent(eventType.id, "booking_confirmed")
      } else {
        const error = await res.json()
        toast(error.error || "Failed to book", "error")
      }
    } catch (error) {
      console.error("Error booking:", error)
      toast("Failed to book", "error")
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

  const hasAvailability = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return availableDates.has(dateStr)
  }

  // Redirect to custom URL after booking if configured
  const [redirectCountdown, setRedirectCountdown] = useState(3)
  useEffect(() => {
    if (isBooked && eventType?.redirectUrl) {
      const timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            window.location.href = eventType.redirectUrl!
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isBooked, eventType?.redirectUrl])

  // Read embed color params
  const embedPrimaryColor = searchParams.get("primaryColor") ? `#${searchParams.get("primaryColor")}` : null
  const embedBgColor = searchParams.get("bgColor") ? `#${searchParams.get("bgColor")}` : null

  // Apply embed colors as CSS custom properties
  useEffect(() => {
    if (embedPrimaryColor) document.documentElement.style.setProperty('--embed-primary', embedPrimaryColor)
    if (embedBgColor) document.documentElement.style.setProperty('--embed-bg', embedBgColor)
    return () => {
      document.documentElement.style.removeProperty('--embed-primary')
      document.documentElement.style.removeProperty('--embed-bg')
    }
  }, [embedPrimaryColor, embedBgColor])

  // Use embed colors with fallback to branding
  const effectiveAccent = embedPrimaryColor || accent
  const effectiveBg = embedBgColor || undefined

  if (isBooked && eventType && selectedDate && selectedTime) {
    return (
      <div className={`min-h-screen flex flex-col ${isEmbed ? '!min-h-0' : ''}`} style={{ backgroundColor: effectiveBg || '#f9fafb' }}>
        {!isEmbed && (
          <header className="py-4 px-4">
            <div className="max-w-md mx-auto">
              {branding.brandLogo ? (
                <img src={branding.brandLogo} alt="Logo" className="h-6 object-contain opacity-60" />
              ) : (
                <Link href="/" className="inline-flex opacity-60 hover:opacity-100 transition-opacity">
                  <Image src="/logo-full.svg" alt="letsmeet.link" width={100} height={24} />
                </Link>
              )}
            </div>
          </header>
        )}

        <main className={`flex-1 flex items-center justify-center ${isEmbed ? 'p-2' : 'p-4'}`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Booking Confirmed!</h1>
            {eventType.redirectUrl ? (
              <p className="text-gray-600 mb-6">
                Redirecting in {redirectCountdown}s...
              </p>
            ) : (
            <p className="text-gray-600 mb-6">
              Your {eventType.title} with {username} has been scheduled.
            </p>
            )}
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <p className="font-semibold text-[#1a1a2e]">{eventType.title}</p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric", year: "numeric",
                })}
              </p>
              <p className="text-sm text-gray-500">{selectedTime} ({guestTimezone})</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              A confirmation email has been sent to {formData.email}
            </p>
            {/* Custom confirmation links */}
            {eventType.confirmationLinks && (() => {
              try {
                const links: {label: string; url: string}[] = JSON.parse(eventType.confirmationLinks)
                if (links.length === 0) return null
                return (
                  <div className="mb-4 space-y-2">
                    {links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-2.5 px-4 text-center text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                      >
                        {link.label} →
                      </a>
                    ))}
                  </div>
                )
              } catch { return null }
            })()}
            {bookingId && (
              <Link
                href={`/booking/${bookingId}`}
                className="inline-flex items-center justify-center w-full py-3 px-4 text-white rounded-lg font-medium transition-colors"
                style={{ backgroundColor: effectiveAccent }}
              >
                View Booking Details
              </Link>
            )}
          </div>
        </main>

        {!isEmbed && <PoweredByFooter hidden={branding.hidePoweredBy} />}
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col ${isEmbed ? '!min-h-0' : ''}`} style={{ backgroundColor: effectiveBg || '#f9fafb' }}>
      {!isEmbed && (
        <header className="py-4 px-4 border-b border-gray-100 bg-white">
          <div className="max-w-4xl mx-auto">
            {branding.brandLogo ? (
              <img src={branding.brandLogo} alt="Logo" className="h-6 object-contain opacity-60" />
            ) : (
              <Link href="/" className="inline-flex opacity-60 hover:opacity-100 transition-opacity">
                <Image src="/logo-full.svg" alt="letsmeet.link" width={100} height={24} />
              </Link>
            )}
          </div>
        </header>
      )}

      <main className={`flex-1 ${isEmbed ? 'py-2 px-2' : 'py-8 px-4'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="md:flex">
              {/* Left side - Event info */}
              <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
                <button
                  onClick={() => router.push(`/${username}`)}
                  className="text-sm mb-4 font-medium"
                  style={{ color: effectiveAccent }}
                >
                  ← Back
                </button>
                {eventType ? (
                  <>
                    {hostName && (
                      <p className="text-sm text-gray-500 mb-1">{hostName}</p>
                    )}
                    <h1 className="text-xl font-bold text-[#1a1a2e]">{eventType.title}</h1>
                    <div className="flex items-center gap-2 mt-3 text-gray-500">
                      <Clock className="w-4 h-4" style={{ color: effectiveAccent }} />
                      <span>{eventType.duration} min</span>
                    </div>
                    {eventType.location && (
                      <div className="flex items-center gap-2 mt-2 text-gray-500">
                        <MapPin className="w-4 h-4" style={{ color: effectiveAccent }} />
                        <span>{eventType.location}</span>
                      </div>
                    )}
                    {eventType.description && (
                      <p className="mt-4 text-gray-600 text-sm">{eventType.description}</p>
                    )}
                    {eventType.cancellationPolicy && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs font-medium text-amber-800 mb-1">Cancellation Policy</p>
                        <p className="text-xs text-amber-700">{eventType.cancellationPolicy}</p>
                      </div>
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
                          aria-label="Previous month"
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
                          aria-label="Next month"
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
                          const available = hasAvailability(day)
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
                              aria-label={new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                              className={`
                                py-2 rounded-full text-sm transition-colors relative
                                ${disabled ? "text-gray-400 cursor-not-allowed" : "hover:bg-blue-50"}
                                ${selected ? "bg-[#0066FF] text-white hover:bg-[#0052cc]" : ""}
                                ${!disabled && !selected && available ? "font-semibold text-[#1a1a2e]" : ""}
                              `}
                            >
                              {day}
                              {!disabled && available && !isLoadingMonth && (
                                <span
                                  className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                                    selected ? "bg-white" : "bg-[#0066FF]"
                                  }`}
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Timezone selector */}
                      <div className="mt-4 relative" ref={tzDropdownRef}>
                        <button
                          onClick={() => setShowTimezoneSelector(!showTimezoneSelector)}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>{guestTimezone.replace(/_/g, " ")}</span>
                        </button>
                        {showTimezoneSelector && (
                          <div className="absolute bottom-full left-0 mb-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <div className="p-2 border-b border-gray-100">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                  type="text"
                                  value={timezoneSearch}
                                  onChange={(e) => setTimezoneSearch(e.target.value)}
                                  placeholder="Search timezones..."
                                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#0066FF] focus:border-transparent"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredTimezones.map((tz) => (
                                <button
                                  key={tz}
                                  onClick={() => {
                                    setGuestTimezone(tz)
                                    setShowTimezoneSelector(false)
                                    setTimezoneSearch("")
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${
                                    tz === guestTimezone ? "bg-blue-50 text-[#0066FF] font-medium" : "text-gray-700"
                                  }`}
                                >
                                  {tz.replace(/_/g, " ")}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
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
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                            </div>
                          ) : slots.length === 0 ? (
                            <div className="text-sm text-gray-500 py-4 text-center">
                              <p>No times available on this day.</p>
                              <p className="mt-1 text-gray-400">Try another date.</p>
                            </div>
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
                                  w-full py-2.5 px-3 text-sm border rounded-lg font-medium transition-colors focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2
                                  ${
                                    selectedTime === slot
                                      ? "border-[#0066FF] bg-blue-50 text-[#0066FF]"
                                      : "border-gray-200 hover:border-[#0066FF] hover:text-[#0066FF]"
                                  }
                                `}
                              >
                                {slot}
                                {spotsLeft[slot] !== undefined && eventType?.maxAttendees && eventType.maxAttendees > 1 && (
                                  <span className="block text-xs font-normal text-gray-400 mt-0.5">
                                    {spotsLeft[slot]} spot{spotsLeft[slot] !== 1 ? "s" : ""} left
                                  </span>
                                )}
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
                      className="text-sm mb-4 font-medium"
                      style={{ color: effectiveAccent }}
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
                      <p className="text-xs text-gray-500 mt-1">{guestTimezone.replace(/_/g, " ")}</p>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Additional notes <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-shadow resize-none"
                          placeholder="Share anything that will help prepare for the meeting..."
                        />
                      </div>
                      {/* Screening Questions */}
                      {eventType?.screeningQuestions && (() => {
                        const questions: ScreeningQuestion[] = (() => { try { return JSON.parse(eventType.screeningQuestions!) } catch { return [] } })()
                        if (questions.length === 0) return null
                        return (
                          <div className="border-t border-gray-100 pt-4">
                            <p className="text-sm font-medium text-gray-700 mb-3">Screening Questions</p>
                            {questions.map((q) => (
                              <div key={q.id} className="mb-3">
                                <label className="block text-sm text-gray-700 mb-1">
                                  {q.label} {q.required && <span className="text-red-500">*</span>}
                                </label>
                                {q.type === "text" && (
                                  <input
                                    type="text"
                                    required={q.required}
                                    value={screeningAnswers[q.id] || ""}
                                    onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                                  />
                                )}
                                {q.type === "select" && q.options && (
                                  <select
                                    required={q.required}
                                    value={screeningAnswers[q.id] || ""}
                                    onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent bg-white"
                                  >
                                    <option value="">Select...</option>
                                    {q.options.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                )}
                                {q.type === "checkbox" && (
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      required={q.required}
                                      checked={screeningAnswers[q.id] === "true"}
                                      onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.checked ? "true" : "false" })}
                                      className="rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]"
                                    />
                                    <span className="text-sm text-gray-600">Yes</span>
                                  </label>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Book on behalf of someone else */}
                      <div className="border-t border-gray-100 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bookForOther}
                            onChange={(e) => setBookForOther(e.target.checked)}
                            className="rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]"
                          />
                          <span className="text-sm text-gray-700">Book for someone else</span>
                        </label>
                        {bookForOther && (
                          <div className="mt-3 space-y-3 pl-6">
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Your name (booker) *</label>
                              <input
                                type="text"
                                required
                                value={bookerName}
                                onChange={(e) => setBookerName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                                placeholder="Your name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">Your email (booker) *</label>
                              <input
                                type="email"
                                required
                                value={bookerEmail}
                                onChange={(e) => setBookerEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                                placeholder="you@example.com"
                              />
                            </div>
                            <p className="text-xs text-gray-400">
                              Both you and the attendee above will receive confirmation emails.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Recurrence option */}
                      {eventType?.allowRecurring && eventType.recurrenceOptions && (() => {
                        const options: string[] = (() => { try { return JSON.parse(eventType.recurrenceOptions!) } catch { return [] } })()
                        if (options.length === 0) return null
                        const labels: Record<string, string> = {
                          weekly_4: "Weekly × 4 (1 month)",
                          weekly_8: "Weekly × 8 (2 months)",
                          biweekly_4: "Biweekly × 4 (2 months)",
                          monthly_3: "Monthly × 3 (3 months)",
                        }
                        return (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <Repeat className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                              Recurring
                            </label>
                            <select
                              value={formData.recurrenceRule}
                              onChange={(e) => setFormData({ ...formData, recurrenceRule: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-shadow bg-white"
                            >
                              <option value="">One-time meeting</option>
                              {options.map((opt: string) => (
                                <option key={opt} value={opt}>{labels[opt] || opt}</option>
                              ))}
                            </select>
                            {formData.recurrenceRule && (
                              <p className="text-xs text-gray-500 mt-1">
                                This will book multiple meetings on the same day/time
                              </p>
                            )}
                          </div>
                        )
                      })()}
                      {/* Screening Questions */}
                      {eventType?.screeningQuestions && (() => {
                        const questions: ScreeningQuestion[] = (() => { try { return JSON.parse(eventType.screeningQuestions!) } catch { return [] } })()
                        if (questions.length === 0) return null
                        return (
                          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-700">Screening Questions</p>
                            {questions.map((q) => (
                              <div key={q.id}>
                                <label className="block text-sm text-gray-700 mb-1">
                                  {q.label} {q.required && <span className="text-red-500">*</span>}
                                </label>
                                {q.type === "text" && (
                                  <input
                                    type="text"
                                    required={q.required}
                                    value={(screeningAnswers[q.id] as string) || ""}
                                    onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                                  />
                                )}
                                {q.type === "select" && q.options && (
                                  <select
                                    required={q.required}
                                    value={(screeningAnswers[q.id] as string) || ""}
                                    onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent bg-white"
                                  >
                                    <option value="">Select...</option>
                                    {q.options.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                )}
                                {q.type === "checkbox" && (
                                  <label className="flex items-center gap-2 text-sm text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={!!screeningAnswers[q.id]}
                                      onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [q.id]: e.target.checked ? "yes" : "" })}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Yes
                                  </label>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                      {/* Book on behalf of someone else */}
                      <div className="border-t border-gray-100 pt-3">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bookForOther}
                            onChange={(e) => setBookForOther(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Book for someone else
                        </label>
                        {bookForOther && (
                          <div className="mt-3 space-y-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-700">Your details (booker):</p>
                            <input
                              type="text"
                              required
                              value={bookerName}
                              onChange={(e) => setBookerName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                              placeholder="Your name"
                            />
                            <input
                              type="email"
                              required
                              value={bookerEmail}
                              onChange={(e) => setBookerEmail(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                              placeholder="Your email"
                            />
                            <p className="text-xs text-blue-600">The name and email above are for the attendee.</p>
                          </div>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                        style={{ backgroundColor: effectiveAccent }}
                      >
                        {isLoading ? "Booking..." : formData.recurrenceRule ? "Confirm Recurring Booking" : "Confirm Booking"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {!isEmbed && <PoweredByFooter className="border-t border-gray-100" hidden={branding.hidePoweredBy} />}
    </div>
  )
}
