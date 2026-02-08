import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import prisma from "@/lib/prisma"
import type { Metadata } from "next"
import RescheduleCalendar from "./RescheduleCalendar"

interface PageProps {
  params: Promise<{ bookingId: string }>
  searchParams: Promise<{ token?: string }>
}

export const metadata: Metadata = {
  title: "Reschedule Booking",
}

export default async function ReschedulePage({ params, searchParams }: PageProps) {
  const { bookingId } = await params
  const { token } = await searchParams
  
  if (!token) {
    redirect(`/booking/${bookingId}`)
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      eventType: true,
      host: {
        select: {
          id: true,
          name: true,
          email: true,
          timezone: true,
          username: true,
        },
      },
    },
  })

  if (!booking) {
    notFound()
  }

  // Verify token
  const { verifyBookingToken } = await import("@/lib/booking-tokens")
  if (!verifyBookingToken(token, bookingId, booking.guestEmail)) {
    redirect(`/booking/${bookingId}`)
  }

  if (booking.status === "CANCELLED") {
    redirect(`/booking/${bookingId}?token=${token}`)
  }

  const isPast = new Date(booking.startTime) < new Date()
  if (isPast) {
    redirect(`/booking/${bookingId}?token=${token}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="py-4 px-4 border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex opacity-60 hover:opacity-100 transition-opacity">
            <Image
              src="/logo-full.svg"
              alt="MeetWhen"
              width={100}
              height={24}
            />
          </Link>
          <Link 
            href={`/booking/${bookingId}?token=${token}`}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to booking
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Reschedule Booking</h1>
            <p className="text-gray-600">
              Select a new time for your meeting with {booking.host.name || booking.host.email}
            </p>
          </div>

          {/* Current Booking Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-amber-600 text-sm font-medium">📅</span>
              </div>
              <div>
                <p className="font-medium text-amber-900">Current booking</p>
                <p className="text-amber-700 text-sm">
                  {booking.eventType.title} • {booking.eventType.duration} min
                </p>
                <p className="text-amber-600 text-sm mt-1">
                  {new Date(booking.startTime).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: booking.guestTimezone,
                  })} at{" "}
                  {new Date(booking.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: booking.guestTimezone,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Reschedule Calendar */}
          <RescheduleCalendar
            bookingId={bookingId}
            token={token}
            guestTimezone={booking.guestTimezone}
            eventType={{
              id: booking.eventType.id,
              title: booking.eventType.title,
              duration: booking.eventType.duration,
              description: booking.eventType.description,
              location: booking.eventType.location,
              maxDaysAhead: booking.eventType.maxDaysAhead,
            }}
            host={{
              name: booking.host.name,
              username: booking.host.username,
              timezone: booking.host.timezone,
            }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-gray-200">
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
