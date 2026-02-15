"use client"

import { Clock, MapPin } from "lucide-react"

interface EventInfoProps {
  hostName: string
  title: string
  duration: number
  location: string | null
  description: string | null
  cancellationPolicy: string | null
  accentColor: string
  username: string
  onBack: () => void
}

export default function EventInfo({
  hostName,
  title,
  duration,
  location,
  description,
  cancellationPolicy,
  accentColor,
  onBack,
}: EventInfoProps) {
  return (
    <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
      <button
        onClick={onBack}
        className="text-sm mb-4 font-medium"
        style={{ color: accentColor }}
      >
        ← Back
      </button>
      {hostName && <p className="text-sm text-gray-500 mb-1">{hostName}</p>}
      <h1 className="text-xl font-bold text-[#1a1a2e]">{title}</h1>
      <div className="flex items-center gap-2 mt-3 text-gray-500">
        <Clock className="w-4 h-4" style={{ color: accentColor }} />
        <span>{duration} min</span>
      </div>
      {location && (
        <div className="flex items-center gap-2 mt-2 text-gray-500">
          <MapPin className="w-4 h-4" style={{ color: accentColor }} />
          <span>{location}</span>
        </div>
      )}
      {description && <p className="mt-4 text-gray-600 text-sm">{description}</p>}
      {cancellationPolicy && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-medium text-amber-800 mb-1">Cancellation Policy</p>
          <p className="text-xs text-amber-700">{cancellationPolicy}</p>
        </div>
      )}
    </div>
  )
}
