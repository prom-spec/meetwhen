"use client"

import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  TrendingUp,
  Calendar,
  Eye,
  MousePointerClick,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
} from "lucide-react"
import BookingTrendsChart from "@/components/BookingTrendsChart"
import BusiestTimesHeatmap from "@/components/BusiestTimesHeatmap"

interface Summary {
  bookings: {
    total: number
    thisWeek: number
    thisMonth: number
    upcoming: number
    completed: number
    cancelled: number
  }
  funnel: {
    views: number
    slotSelections: number
    confirmations: number
    viewToSlotRate: number
    slotToBookingRate: number
    overallConversionRate: number
  }
}

interface EventStats {
  id: string
  title: string
  color: string
  duration: number
  isActive: boolean
  bookings: number
  views: number
  conversionRate: number
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [events, setEvents] = useState<EventStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [summaryRes, eventsRes] = await Promise.all([
        fetch("/api/analytics/summary"),
        fetch("/api/analytics/events"),
      ])

      if (summaryRes.ok) setSummary(await summaryRes.json())
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEvents(eventsData.events || [])
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Bookings"
          value={summary?.bookings.total || 0}
          icon={<Calendar className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="This Week"
          value={summary?.bookings.thisWeek || 0}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="This Month"
          value={summary?.bookings.thisMonth || 0}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Conversion Rate"
          value={`${summary?.funnel.overallConversionRate || 0}%`}
          icon={<MousePointerClick className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Booking Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming</p>
              <p className="text-2xl font-bold text-[#1a1a2e]">{summary?.bookings.upcoming || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-[#1a1a2e]">{summary?.bookings.completed || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cancelled</p>
              <p className="text-2xl font-bold text-[#1a1a2e]">{summary?.bookings.cancelled || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Booking Funnel</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FunnelStep
            icon={<Eye className="w-5 h-5" />}
            label="Page Views"
            value={summary?.funnel.views || 0}
            color="gray"
          />
          <FunnelStep
            icon={<MousePointerClick className="w-5 h-5" />}
            label="Slot Selected"
            value={summary?.funnel.slotSelections || 0}
            rate={summary?.funnel.viewToSlotRate}
            color="blue"
          />
          <FunnelStep
            icon={<CheckCircle className="w-5 h-5" />}
            label="Confirmed"
            value={summary?.funnel.confirmations || 0}
            rate={summary?.funnel.slotToBookingRate}
            color="green"
          />
          <FunnelStep
            icon={<TrendingUp className="w-5 h-5" />}
            label="Overall Rate"
            value={`${summary?.funnel.overallConversionRate || 0}%`}
            color="purple"
            isRate
          />
        </div>
      </div>

      {/* Booking Trends Chart */}
      <div className="mb-8">
        <BookingTrendsChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Popular Event Types */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-6">Popular Event Types</h2>
          {events.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={events.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                  <YAxis
                    dataKey="title"
                    type="category"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="bookings" fill="#0066FF" radius={[0, 4, 4, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No event types yet
            </div>
          )}
        </div>

        {/* Busiest Times Heatmap */}
        <BusiestTimesHeatmap />
      </div>

      {/* Event Types Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Event Type Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No event types yet
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                        <div>
                          <div className="font-medium text-[#1a1a2e]">{event.title}</div>
                          <div className="text-sm text-gray-500">{event.duration} min</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{event.views}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{event.bookings}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${event.conversionRate > 10 ? 'text-green-600' : 'text-gray-600'}`}>
                        {event.conversionRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          event.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {event.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  color: "blue" | "green" | "purple" | "orange"
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <span className="text-sm text-gray-500">{title}</span>
      </div>
      <p className="text-3xl font-bold text-[#1a1a2e]">{value}</p>
    </div>
  )
}

function FunnelStep({
  icon,
  label,
  value,
  rate,
  color,
  isRate,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  rate?: number
  color: "gray" | "blue" | "green" | "purple"
  isRate?: boolean
}) {
  const colorClasses = {
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  }

  return (
    <div className="text-center">
      <div className={`inline-flex p-3 rounded-full mb-2 ${colorClasses[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-[#1a1a2e]">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {rate !== undefined && !isRate && (
        <p className="text-xs text-gray-400 mt-1">{rate}% conversion</p>
      )}
    </div>
  )
}
