"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, User, Mail, MoreHorizontal } from "lucide-react"

// Note: metadata must be in a separate layout.tsx for client components
// Title is set in the dashboard layout

interface Booking {
  id: string
  guestName: string
  guestEmail: string
  guestTimezone: string
  startTime: string
  endTime: string
  status: string
  notes: string | null
  eventType: {
    title: string
    duration: number
    color: string
  }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming")

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/bookings")
      const data = await res.json()
      if (Array.isArray(data)) {
        setBookings(data)
      }
    } catch (error) {
      console.error("Error fetching bookings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const now = new Date()
  const filteredBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.startTime)
    if (filter === "upcoming") return bookingDate >= now && booking.status !== "CANCELLED"
    if (filter === "past") return bookingDate < now || booking.status === "CANCELLED"
    return true
  })

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your upcoming and past meetings
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {(["upcoming", "past", "all"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm capitalize
                ${filter === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No {filter} bookings</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className={`bg-white rounded-lg border-l-4 shadow-sm p-4 ${
                booking.status === "CANCELLED" ? "opacity-60" : ""
              }`}
              style={{ borderLeftColor: booking.eventType.color }}
            >
              <div className="sm:flex sm:justify-between sm:items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {booking.eventType.title}
                    </h3>
                    {booking.status === "CANCELLED" && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                        Cancelled
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {formatDate(booking.startTime)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      <span className="text-gray-400">({booking.eventType.duration} min)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      {booking.guestName}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {booking.guestEmail}
                    </div>
                  </div>

                  {booking.notes && (
                    <p className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                      {booking.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 sm:mt-0 sm:ml-4">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
