"use client"

import Link from "next/link"
import Image from "next/image"
import { CheckCircle } from "lucide-react"
import PoweredByFooter from "@/components/PoweredByFooter"

interface ConfirmationLink {
  label: string
  url: string
}

interface BookingConfirmationProps {
  eventTitle: string
  username: string
  hostName: string
  selectedDate: Date
  selectedTime: string
  guestTimezone: string
  guestEmail: string
  bookingId: string | null
  redirectUrl: string | null
  redirectCountdown: number
  confirmationLinks: string | null
  accentColor: string
  effectiveBg?: string
  isEmbed: boolean
  brandLogo: string | null
  hidePoweredBy: boolean
  orgBrandFooter?: string | null
  userPlan?: string
}

export default function BookingConfirmation({
  eventTitle,
  username,
  selectedDate,
  selectedTime,
  guestTimezone,
  guestEmail,
  bookingId,
  redirectUrl,
  redirectCountdown,
  confirmationLinks,
  accentColor,
  effectiveBg,
  isEmbed,
  brandLogo,
  hidePoweredBy,
  orgBrandFooter,
  userPlan,
}: BookingConfirmationProps) {
  let parsedLinks: ConfirmationLink[] = []
  if (confirmationLinks) {
    try {
      parsedLinks = JSON.parse(confirmationLinks)
    } catch { /* ignore */ }
  }

  return (
    <div className={`min-h-screen flex flex-col ${isEmbed ? '!min-h-0' : ''}`} style={{ backgroundColor: effectiveBg || '#f9fafb' }}>
      {!isEmbed && (
        <header className="py-4 px-4">
          <div className="max-w-md mx-auto">
            {brandLogo ? (
              <img src={brandLogo} alt="Logo" className="h-6 object-contain opacity-60" />
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
          {redirectUrl ? (
            <p className="text-gray-600 mb-6">Redirecting in {redirectCountdown}s...</p>
          ) : (
            <p className="text-gray-600 mb-6">
              Your {eventTitle} with {username} has been scheduled.
            </p>
          )}
          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
            <p className="font-semibold text-[#1a1a2e]">{eventTitle}</p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </p>
            <p className="text-sm text-gray-500">{selectedTime} ({guestTimezone})</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            A confirmation email has been sent to {guestEmail}
          </p>
          {parsedLinks.length > 0 && (
            <div className="mb-4 space-y-2">
              {parsedLinks.map((link, i) => (
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
          )}
          {bookingId && (
            <Link
              href={`/booking/${bookingId}`}
              className="inline-flex items-center justify-center w-full py-3 px-4 text-white rounded-lg font-medium transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              View Booking Details
            </Link>
          )}
        </div>
      </main>

      {orgBrandFooter && (
        <div className="text-center text-xs text-gray-400 py-2">{orgBrandFooter}</div>
      )}
      {!isEmbed && <PoweredByFooter hidden={hidePoweredBy} userPlan={userPlan} />}
    </div>
  )
}
