import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import prisma from "@/lib/prisma"
import { CheckCircle, Calendar, Clock, MapPin, User, Mail } from "lucide-react"
import type { Metadata } from "next"

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Booking Confirmed",
}

export default async function BookingConfirmationPage({ params }: PageProps) {
  const { id } = await params
  
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      eventType: true,
      host: true,
    },
  })

  if (!booking) {
    notFound()
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const generateGoogleCalendarUrl = () => {
    const start = new Date(booking.startTime).toISOString().replace(/-|:|\.\d+/g, "")
    const end = new Date(booking.endTime).toISOString().replace(/-|:|\.\d+/g, "")
    const title = encodeURIComponent(booking.eventType.title)
    const details = encodeURIComponent(`Meeting with ${booking.host.name || booking.host.email}`)
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">Confirmed!</h1>
            <p className="text-gray-500 mt-1">
              You're scheduled with {booking.host.name || booking.host.email}
            </p>
          </div>

          {/* Booking Details */}
          <div className="border border-gray-200 rounded-lg p-5 space-y-4">
            <div className="font-semibold text-[#1a1a2e] text-lg">
              {booking.eventType.title}
            </div>
            
            <div className="flex items-start gap-3 text-gray-600">
              <Calendar className="w-5 h-5 mt-0.5 text-[#0066FF]" />
              <div>
                <p className="font-medium">{formatDate(booking.startTime)}</p>
                <p className="text-sm text-gray-500">
                  {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-600">
              <Clock className="w-5 h-5 text-[#0066FF]" />
              <span>{booking.eventType.duration} minutes</span>
            </div>

            {booking.eventType.location && (
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-[#0066FF]" />
                <span>{booking.eventType.location}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center gap-3 text-gray-600 mb-2">
                <User className="w-5 h-5 text-gray-400" />
                <span>{booking.guestName}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5 text-gray-400" />
                <span>{booking.guestEmail}</span>
              </div>
            </div>

            {booking.notes && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500 mb-1">Notes:</p>
                <p className="text-gray-700">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Add to Calendar */}
          <div className="mt-6 space-y-3">
            <a
              href={generateGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052cc] transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Add to Google Calendar
            </a>
            
            <p className="text-center text-sm text-gray-500">
              A calendar invitation has been sent to your email
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
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
