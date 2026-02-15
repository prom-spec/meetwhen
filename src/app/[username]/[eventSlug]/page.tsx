"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Globe, Search } from "lucide-react"
import PoweredByFooter from "@/components/PoweredByFooter"
import { useToast } from "@/components/ToastProvider"
import BookingConfirmation from "./BookingConfirmation"
import EventInfo from "./EventInfo"
import TimeSlotList from "./TimeSlotList"
import BookingForm from "./BookingForm"

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
  orgBrandFooter?: string | null
  orgManaged?: boolean
  plan?: string
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
  const [branding, setBranding] = useState<Branding>({ brandColor: null, accentColor: null, brandLogo: null, hidePoweredBy: false, gaTrackingId: null, metaPixelId: null, orgBrandFooter: null, orgManaged: false })
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
      <BookingConfirmation
        eventTitle={eventType.title}
        username={username as string}
        hostName={hostName}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        guestTimezone={guestTimezone}
        guestEmail={formData.email}
        bookingId={bookingId}
        redirectUrl={eventType.redirectUrl || null}
        redirectCountdown={redirectCountdown}
        confirmationLinks={eventType.confirmationLinks || null}
        accentColor={effectiveAccent}
        effectiveBg={effectiveBg}
        isEmbed={isEmbed}
        brandLogo={branding.brandLogo}
        hidePoweredBy={branding.hidePoweredBy}
        orgBrandFooter={branding.orgBrandFooter}
        userPlan={branding.plan}
      />
    )
  }

  return (
    <div className={`min-h-screen flex flex-col ${isEmbed ? '!min-h-0' : ''}`} style={{ backgroundColor: effectiveBg || '#f9fafb' }}>
      {!isEmbed && (
        <header className="py-4 px-4 border-b border-gray-100 bg-white">
          <div className="max-w-4xl mx-auto">
            {branding.brandLogo ? (
              <img src={branding.brandLogo} alt="Brand logo" className="h-6 object-contain opacity-60" />
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
              {eventType ? (
                <EventInfo
                  hostName={hostName}
                  title={eventType.title}
                  duration={eventType.duration}
                  location={eventType.location}
                  description={eventType.description}
                  cancellationPolicy={eventType.cancellationPolicy || null}
                  accentColor={effectiveAccent}
                  username={username as string}
                  onBack={() => router.push(`/${username}`)}
                />
              ) : (
                <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              )}

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
                      <TimeSlotList
                        selectedDate={selectedDate}
                        slots={slots}
                        selectedTime={selectedTime}
                        isLoading={isLoading}
                        spotsLeft={spotsLeft}
                        maxAttendees={eventType?.maxAttendees}
                        onSelectSlot={(slot) => {
                          setSelectedTime(slot)
                          setShowForm(true)
                          if (eventType?.id && !hasTrackedSlot.current) {
                            hasTrackedSlot.current = true
                            trackEvent(eventType.id, "slot_selected")
                          }
                        }}
                      />
                    )}
                  </div>
                ) : (
                  /* Booking Form */
                  <BookingForm
                    eventTitle={eventType?.title || ""}
                    selectedDate={selectedDate!}
                    selectedTime={selectedTime!}
                    guestTimezone={guestTimezone}
                    accentColor={effectiveAccent}
                    isLoading={isLoading}
                    formData={formData}
                    onFormChange={setFormData}
                    screeningAnswers={screeningAnswers}
                    onScreeningChange={setScreeningAnswers}
                    screeningQuestions={eventType?.screeningQuestions || null}
                    bookForOther={bookForOther}
                    onBookForOtherChange={setBookForOther}
                    bookerName={bookerName}
                    onBookerNameChange={setBookerName}
                    bookerEmail={bookerEmail}
                    onBookerEmailChange={setBookerEmail}
                    allowRecurring={eventType?.allowRecurring || false}
                    recurrenceOptions={eventType?.recurrenceOptions || null}
                    onSubmit={handleBook}
                    onBack={() => setShowForm(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {!isEmbed && <PoweredByFooter className="border-t border-gray-100" hidden={branding.hidePoweredBy} userPlan={branding.plan} />}
    </div>
  )
}
