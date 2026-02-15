"use client"

import { Loader2 } from "lucide-react"

interface TimeSlotListProps {
  selectedDate: Date
  slots: string[]
  selectedTime: string | null
  isLoading: boolean
  spotsLeft: Record<string, number>
  maxAttendees?: number
  onSelectSlot: (slot: string) => void
}

export default function TimeSlotList({
  selectedDate,
  slots,
  selectedTime,
  isLoading,
  spotsLeft,
  maxAttendees,
  onSelectSlot,
}: TimeSlotListProps) {
  return (
    <div className="md:w-44">
      <h3 className="font-medium mb-3 text-sm text-[#1a1a2e]">
        {selectedDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </h3>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-[#0066FF]" />
          </div>
        ) : slots.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">
            <p>No times available on this day.</p>
            <p className="mt-1 text-gray-400">Try another date.</p>
          </div>
        ) : (
          slots.map((slot) => (
            <button
              key={slot}
              onClick={() => onSelectSlot(slot)}
              className={`
                w-full py-2.5 px-3 text-sm border rounded-lg font-medium transition-colors focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2
                ${
                  selectedTime === slot
                    ? "border-[#0066FF] bg-blue-50 text-[#0066FF]"
                    : "border-gray-200 hover:border-[#0066FF] hover:text-[#0066FF]"
                }
              `}
            >
              {slot}
              {spotsLeft[slot] !== undefined && maxAttendees && maxAttendees > 1 && (
                <span className="block text-xs font-normal text-gray-400 mt-0.5">
                  {spotsLeft[slot]} spot{spotsLeft[slot] !== 1 ? "s" : ""} left
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
