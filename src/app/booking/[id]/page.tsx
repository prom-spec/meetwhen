import { notFound } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { CheckCircle, Calendar, Clock, MapPin, User, Mail } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Confirmed</h1>
          <p className="text-gray-500 mt-1">
            You are scheduled with {booking.host.name || booking.host.email}
          </p>
        </div>

        {/* Booking Details */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="font-semibold text-gray-900 text-lg">
            {booking.eventType.title}
          </div>
          
          <div className="flex items-start gap-3 text-gray-600">
            <Calendar className="w-5 h-5 mt-0.5 text-gray-400" />
            <div>
              <p>{formatDate(booking.startTime)}</p>
              <p className="text-sm">
                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-gray-600">
            <Clock className="w-5 h-5 text-gray-400" />
            <span>{booking.eventType.duration} minutes</span>
          </div>

          {booking.eventType.location && (
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-5 h-5 text-gray-400" />
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
              <p className="text-sm text-gray-500">Notes:</p>
              <p className="text-gray-700 mt-1">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Add to Calendar */}
        <div className="mt-6 space-y-3">
          <a
            href={generateGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-md font-medium hover:bg-blue-700"
          >
            Add to Google Calendar
          </a>
          
          <p className="text-center text-sm text-gray-500">
            A calendar invitation has been sent to your email
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-400">
            Powered by <span className="font-semibold text-blue-600">CalClone</span>
          </p>
        </div>
      </div>
    </div>
  )
}
