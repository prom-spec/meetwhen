"use client"

import { useState, useEffect, use } from "react"
import { Clock, Calendar, CheckCircle, AlertCircle } from "lucide-react"

interface LinkData {
  id: string
  title: string
  duration: number
  availableSlots: string
  expiresAt: string | null
  maxUses: number
  usedCount: number
  bookings: { slotTime: string }[]
  user: { name: string | null; image: string | null }
}

export default function MeetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [link, setLink] = useState<LinkData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)

  useEffect(() => {
    fetch(`/api/meet/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Link not found")
          return
        }
        setLink(await res.json())
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  }, [slug])

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot || !link) return
    setBooking(true)
    setError("")

    const res = await fetch(`/api/one-off-links/${link.id}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName,
        guestEmail,
        slotTime: selectedSlot,
      }),
    })

    if (res.ok) {
      setBooked(true)
    } else {
      const data = await res.json()
      setError(data.error || "Booking failed")
    }
    setBooking(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]" />
      </div>
    )
  }

  if (error && !link) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Unavailable</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500">
            Your meeting &quot;{link?.title}&quot; has been booked for{" "}
            {selectedSlot && new Date(selectedSlot).toLocaleString()}.
          </p>
        </div>
      </div>
    )
  }

  if (!link) return null

  const allSlots: string[] = JSON.parse(link.availableSlots)
  const bookedSlots = new Set(link.bookings.map((b) => new Date(b.slotTime).toISOString()))
  const availableSlots = allSlots.filter((s) => !bookedSlots.has(new Date(s).toISOString()))
  const isExpired =
    link.usedCount >= link.maxUses ||
    (link.expiresAt && new Date(link.expiresAt) < new Date())

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">This link has expired.</h1>
          <p className="text-gray-500">This meeting link is no longer available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg w-full">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{link.title}</h1>
          {link.user.name && (
            <p className="text-gray-500 mt-1">with {link.user.name}</p>
          )}
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {link.duration} minutes
          </div>
        </div>

        <form onSubmit={handleBook}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Pick a time
            </label>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedSlot === slot
                      ? "border-[#0066FF] bg-blue-50 text-[#0066FF]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {new Date(slot).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </button>
              ))}
              {availableSlots.length === 0 && (
                <p className="text-gray-400 text-sm">No slots available</p>
              )}
            </div>
          </div>

          {selectedSlot && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          {selectedSlot && (
            <button
              type="submit"
              disabled={booking}
              className="w-full py-3 bg-[#0066FF] text-white rounded-lg hover:bg-[#0052CC] disabled:opacity-50 transition-colors font-medium"
            >
              {booking ? "Booking..." : "Confirm Booking"}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
