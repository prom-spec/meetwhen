import { notFound } from "next/navigation"
import prisma from "@/lib/prisma"
import BookingCalendar from "./BookingCalendar"

interface PageProps {
  params: Promise<{ username: string; eventSlug: string }>
}

export default async function BookingPage({ params }: PageProps) {
  const { username, eventSlug } = await params
  
  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user) {
    notFound()
  }

  const eventType = await prisma.eventType.findUnique({
    where: {
      userId_slug: {
        userId: user.id,
        slug: eventSlug,
      },
    },
  })

  if (!eventType || !eventType.isActive) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="md:flex">
            {/* Event Info Sidebar */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3 mb-4">
                {user.image && (
                  <img
                    src={user.image}
                    alt={user.name || username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-sm text-gray-500">{user.name || username}</p>
                </div>
              </div>
              
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {eventType.title}
              </h1>
              
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {eventType.duration} min
              </div>

              {eventType.description && (
                <p className="text-sm text-gray-600 mb-4">
                  {eventType.description}
                </p>
              )}

              {eventType.location && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {eventType.location}
                </div>
              )}
            </div>

            {/* Calendar Section */}
            <div className="md:w-2/3 p-6">
              <BookingCalendar
                username={username}
                eventSlug={eventSlug}
                eventTypeId={eventType.id}
                duration={eventType.duration}
                maxDaysAhead={eventType.maxDaysAhead}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
