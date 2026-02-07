import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import Link from "next/link"
import { Calendar, Clock, Users } from "lucide-react"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  const [eventTypesCount, upcomingBookings, totalBookings] = await Promise.all([
    prisma.eventType.count({ where: { userId: session.user.id } }),
    prisma.booking.findMany({
      where: {
        hostId: session.user.id,
        startTime: { gte: new Date() },
        status: "CONFIRMED",
      },
      include: { eventType: true },
      orderBy: { startTime: "asc" },
      take: 5,
    }),
    prisma.booking.count({ where: { hostId: session.user.id } }),
  ])

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Event Types</p>
              <p className="text-2xl font-semibold text-gray-900">{eventTypesCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Upcoming</p>
              <p className="text-2xl font-semibold text-gray-900">{upcomingBookings.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900">{totalBookings}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h2>
        </div>
        {upcomingBookings.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>No upcoming meetings</p>
            <Link
              href="/dashboard/event-types"
              className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
            >
              Create an event type to get started
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {upcomingBookings.map((booking) => (
              <li key={booking.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{booking.guestName}</p>
                    <p className="text-sm text-gray-500">{booking.eventType.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(booking.startTime).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(booking.startTime).toLocaleTimeString([], { 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
