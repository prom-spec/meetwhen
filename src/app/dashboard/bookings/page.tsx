"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Calendar, Clock, User, Mail, MoreHorizontal, Loader2, CalendarX, XCircle, RefreshCw } from "lucide-react"
import ConfirmDialog from "@/components/ConfirmDialog"

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
  screeningAnswers: string | null
  bookedByName: string | null
  bookedByEmail: string | null
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [confirmRescheduleId, setConfirmRescheduleId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleCancel = async (id: string) => {
    setConfirmCancelId(id)
    setOpenMenuId(null)
  }

  const executeCancelBooking = async () => {
    if (!confirmCancelId) return
    setActionLoading(confirmCancelId)
    try {
      const res = await fetch(`/api/bookings/${confirmCancelId}`, {
        method: "DELETE",
      })
      if (res.ok) fetchBookings()
    } catch (error) {
      console.error("Error cancelling booking:", error)
    }
    setActionLoading(null)
    setConfirmCancelId(null)
  }

  const handleRequestReschedule = async (id: string) => {
    setConfirmRescheduleId(id)
    setOpenMenuId(null)
  }

  const executeRequestReschedule = async () => {
    if (!confirmRescheduleId) return
    setActionLoading(confirmRescheduleId)
    try {
      const res = await fetch(`/api/bookings/${confirmRescheduleId}/request-reschedule`, {
        method: "POST",
      })
      if (res.ok) fetchBookings()
    } catch (error) {
      console.error("Error requesting reschedule:", error)
    }
    setActionLoading(null)
    setConfirmRescheduleId(null)
  }

  const now = new Date()
  const filteredBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.startTime)
    if (filter === "upcoming") return bookingDate >= now && booking.status !== "CANCELLED"
    if (filter === "past") return bookingDate < now || booking.status === "CANCELLED" || booking.status === "COMPLETED"
    return true
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <ConfirmDialog
        open={!!confirmCancelId}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? The guest will be notified by email."
        confirmLabel="Cancel Booking"
        onConfirm={executeCancelBooking}
        onCancel={() => setConfirmCancelId(null)}
      />
      <ConfirmDialog
        open={!!confirmRescheduleId}
        title="Request Reschedule"
        message="This will send an email to the guest asking them to pick a new time. Continue?"
        confirmLabel="Send Request"
        onConfirm={executeRequestReschedule}
        onCancel={() => setConfirmRescheduleId(null)}
      />
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
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <CalendarX className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No {filter} bookings</h3>
          <p className="text-sm text-gray-500 mb-6">
            {filter === "upcoming"
              ? "You don't have any upcoming meetings scheduled."
              : filter === "past"
              ? "No past bookings to show yet."
              : "No bookings found."}
          </p>
          <Link
            href="/dashboard/event-types"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Share your booking link
          </Link>
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
                    {booking.status === "PENDING_RESCHEDULE" && (
                      <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                        Reschedule Requested
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

                  {booking.bookedByName && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Booked by: {booking.bookedByName} ({booking.bookedByEmail})</span>
                    </div>
                  )}

                  {booking.notes && (
                    <p className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                      {booking.notes}
                    </p>
                  )}

                  {booking.screeningAnswers && (() => {
                    try {
                      const answers = JSON.parse(booking.screeningAnswers)
                      const entries = Object.entries(answers)
                      if (entries.length === 0) return null
                      return (
                        <div className="mt-2 text-sm bg-blue-50 p-2 rounded border border-blue-100">
                          <p className="font-medium text-blue-800 text-xs mb-1">Screening Answers</p>
                          {entries.map(([key, value]) => (
                            <p key={key} className="text-blue-700 text-xs">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </p>
                          ))}
                        </div>
                      )
                    } catch { return null }
                  })()}
                </div>

                <div className="relative mt-4 sm:mt-0 sm:ml-4" ref={openMenuId === booking.id ? menuRef : undefined}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === booking.id ? null : booking.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {openMenuId === booking.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      {booking.status !== "CANCELLED" && new Date(booking.startTime) >= now && (
                        <>
                          <Link
                            href={`/reschedule/${booking.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <RefreshCw className="w-4 h-4" />
                            Reschedule
                          </Link>
                          <button
                            onClick={() => handleRequestReschedule(booking.id)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-amber-600 hover:bg-amber-50"
                          >
                            <Mail className="w-4 h-4" />
                            Request Reschedule
                          </button>
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel Booking
                          </button>
                        </>
                      )}
                      <Link
                        href={`/booking/${booking.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setOpenMenuId(null)}
                      >
                        <Calendar className="w-4 h-4" />
                        View Details
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
