import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import prisma from "@/lib/prisma"
import { CheckCircle, Calendar, Clock, MapPin, User, Mail, Globe, XCircle, AlertTriangle, Video, Phone, ExternalLink } from "lucide-react"
import PoweredByFooter from "@/components/PoweredByFooter"
import type { Metadata } from "next"
import BookingActions from "./BookingActions"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export const metadata: Metadata = {
  title: "Booking Details",
}

export default async function BookingConfirmationPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { token } = await searchParams
  
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

  const isCancelled = booking.status === "CANCELLED"

  const formatDate = (date: Date, tz: string) => {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: tz,
    })
  }

  const formatTime = (date: Date, tz: string) => {
    return date.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit",
      timeZone: tz,
    })
  }

  const generateGoogleCalendarUrl = () => {
    const start = new Date(booking.startTime).toISOString().replace(/-|:|\.\d+/g, "")
    const end = new Date(booking.endTime).toISOString().replace(/-|:|\.\d+/g, "")
    const title = encodeURIComponent(booking.eventType.title)
    const details = encodeURIComponent(`Meeting with ${booking.host.name || booking.host.email}`)
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`
  }

  const isPast = new Date(booking.startTime) < new Date()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="py-4 px-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="inline-flex opacity-60 hover:opacity-100 transition-opacity">
            <Image
              src="/logo-full.svg"
              alt="LetsMeet"
              width={100}
              height={24}
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Status Icon */}
          <div className="text-center mb-6">
            {isCancelled ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-[#1a1a2e]">Cancelled</h1>
                <p className="text-gray-500 mt-1">
                  This meeting has been cancelled
                </p>
              </>
            ) : isPast ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Clock className="w-8 h-8 text-gray-600" />
                </div>
                <h1 className="text-2xl font-bold text-[#1a1a2e]">Completed</h1>
                <p className="text-gray-500 mt-1">
                  This meeting has already taken place
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-[#1a1a2e]">Confirmed!</h1>
                <p className="text-gray-500 mt-1">
                  You&apos;re scheduled with {booking.host.name || booking.host.email}
                </p>
              </>
            )}
          </div>

          {/* Booking Details */}
          <div className={`border rounded-lg p-5 space-y-4 ${isCancelled ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <div className={`font-semibold text-lg ${isCancelled ? 'text-gray-500 line-through' : 'text-[#1a1a2e]'}`}>
              {booking.eventType.title}
            </div>
            
            <div className={`flex items-start gap-3 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
              <Calendar className={`w-5 h-5 mt-0.5 ${isCancelled ? 'text-gray-400' : 'text-[#0066FF]'}`} />
              <div>
                <p className="font-medium">{formatDate(booking.startTime, booking.guestTimezone)}</p>
                <p className="text-sm text-gray-500">
                  {formatTime(booking.startTime, booking.guestTimezone)} - {formatTime(booking.endTime, booking.guestTimezone)}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-3 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
              <Globe className={`w-5 h-5 ${isCancelled ? 'text-gray-400' : 'text-[#0066FF]'}`} />
              <span>{booking.guestTimezone.replace(/_/g, " ")}</span>
            </div>

            <div className={`flex items-center gap-3 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
              <Clock className={`w-5 h-5 ${isCancelled ? 'text-gray-400' : 'text-[#0066FF]'}`} />
              <span>{booking.eventType.duration} minutes</span>
            </div>

            {/* Meeting Link - Displayed prominently */}
            {booking.meetingUrl && !isCancelled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Meeting Link</span>
                </div>
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium break-all"
                >
                  {booking.meetingUrl.startsWith("tel:") ? (
                    <>
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      {booking.meetingUrl.replace("tel:", "")}
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      {booking.meetingUrl.length > 40 
                        ? booking.meetingUrl.substring(0, 40) + "..." 
                        : booking.meetingUrl}
                    </>
                  )}
                </a>
              </div>
            )}

            {/* Location for in-person meetings */}
            {booking.eventType.location && !booking.meetingUrl && (
              <div className={`flex items-center gap-3 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
                <MapPin className={`w-5 h-5 ${isCancelled ? 'text-gray-400' : 'text-[#0066FF]'}`} />
                <span>{booking.eventType.location}</span>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className={`flex items-center gap-3 mb-2 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
                <User className="w-5 h-5 text-gray-400" />
                <span>{booking.guestName}</span>
              </div>
              <div className={`flex items-center gap-3 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
                <Mail className="w-5 h-5 text-gray-400" />
                <span>{booking.guestEmail}</span>
              </div>
            </div>

            {booking.notes && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500 mb-1">Notes:</p>
                <p className={isCancelled ? 'text-gray-400' : 'text-gray-700'}>{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isCancelled && !isPast && (
            <div className="mt-6 space-y-3">
              {/* Join Meeting button - prominent for video calls */}
              {booking.meetingUrl && !booking.meetingUrl.startsWith("tel:") && (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <Video className="w-4 h-4" />
                  Join Meeting
                </a>
              )}
              
              {/* Call button for phone meetings */}
              {booking.meetingUrl && booking.meetingUrl.startsWith("tel:") && (
                <a
                  href={booking.meetingUrl}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </a>
              )}
              
              <a
                href={generateGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052cc] transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Add to Google Calendar
              </a>
              
              {token && (
                <BookingActions 
                  bookingId={booking.id}
                  token={token}
                />
              )}
              
              <p className="text-center text-sm text-gray-500">
                A calendar invitation has been sent to your email
              </p>
            </div>
          )}

          {isCancelled && (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">
                    This booking was cancelled. If you&apos;d like to book another time, please visit the host&apos;s booking page.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <PoweredByFooter />
    </div>
  )
}
