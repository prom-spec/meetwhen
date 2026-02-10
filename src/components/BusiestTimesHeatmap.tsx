"use client"

import { useState, useEffect } from "react"

interface HeatmapHour {
  hour: number
  count: number
  intensity: number
}

interface HeatmapDay {
  day: string
  dayIndex: number
  hours: HeatmapHour[]
}

interface HeatmapData {
  heatmap: HeatmapDay[]
  summary: {
    busiestDay: string
    busiestDayCount: number
    busiestHour: number
    busiestHourFormatted: string
    busiestHourCount: number
  }
}

export default function BusiestTimesHeatmap() {
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/analytics/heatmap")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHeatmap(data))
      .catch(() => setHeatmap(null))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Busiest Times</h2>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-400">Loading...</div>
      ) : (
        <>
          {heatmap?.summary && (
            <div className="mb-4 text-sm text-gray-600">
              <p>
                📅 Busiest day: <span className="font-medium text-[#1a1a2e]">{heatmap.summary.busiestDay}</span>
                {" "}({heatmap.summary.busiestDayCount} bookings)
              </p>
              <p>
                🕐 Peak hour: <span className="font-medium text-[#1a1a2e]">{heatmap.summary.busiestHourFormatted}</span>
                {" "}({heatmap.summary.busiestHourCount} bookings)
              </p>
            </div>
          )}
          {heatmap?.heatmap ? (
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                <div className="flex mb-1 ml-10">
                  {[6, 9, 12, 15, 18, 21].map((hour) => (
                    <div
                      key={hour}
                      className="text-xs text-gray-400"
                      style={{ width: `${100 / 6}%` }}
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>
                {heatmap.heatmap.map((day) => (
                  <div key={day.day} className="flex items-center mb-1">
                    <div className="w-10 text-xs text-gray-500">{day.day}</div>
                    <div className="flex flex-1 gap-0.5">
                      {day.hours.filter((_, i) => i >= 6 && i < 22).map((hour) => (
                        <div
                          key={hour.hour}
                          className="flex-1 h-4 rounded-sm transition-colors"
                          style={{
                            backgroundColor: hour.count === 0
                              ? "#f3f4f6"
                              : `rgba(0, 102, 255, ${0.2 + hour.intensity * 0.8})`,
                          }}
                          title={`${day.day} ${hour.hour}:00 - ${hour.count} bookings`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              No booking data yet
            </div>
          )}
        </>
      )}
    </div>
  )
}
