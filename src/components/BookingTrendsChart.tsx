"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface BookingTrend {
  label: string
  date: string
  total: number
  confirmed: number
  cancelled: number
  completed: number
}

export default function BookingTrendsChart() {
  const [trends, setTrends] = useState<BookingTrend[]>([])
  const [period, setPeriod] = useState<"week" | "month" | "year">("week")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/analytics/bookings?period=${period}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTrends(data?.data || []))
      .catch(() => setTrends([]))
      .finally(() => setIsLoading(false))
  }, [period])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[#1a1a2e]">Booking Trends</h2>
        <div className="flex gap-2">
          {(["week", "month", "year"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                period === p
                  ? "bg-[#0066FF] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-400">Loading...</div>
        ) : trends.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#0066FF"
                strokeWidth={2}
                dot={{ fill: "#0066FF", r: 4 }}
                name="Total Bookings"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            No booking data yet
          </div>
        )}
      </div>
    </div>
  )
}
