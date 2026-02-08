"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, X } from "lucide-react"

interface BookingActionsProps {
  bookingId: string
  token: string
}

export default function BookingActions({ bookingId, token }: BookingActionsProps) {
  const router = useRouter()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCancel = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}?token=${token}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to cancel booking")
      }
      
      // Refresh the page to show cancelled state
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking")
    } finally {
      setIsLoading(false)
      setShowCancelConfirm(false)
    }
  }

  const handleReschedule = () => {
    router.push(`/reschedule/${bookingId}?token=${token}`)
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Reschedule & Cancel Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleReschedule}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          <CalendarClock className="w-4 h-4" />
          Reschedule
        </button>
        
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Booking?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this booking? Both you and the host will be notified.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
