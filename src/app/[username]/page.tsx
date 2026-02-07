import { notFound } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"

interface PageProps {
  params: Promise<{ username: string }>
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params
  
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      eventTypes: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!user) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* User Profile Header */}
        <div className="text-center mb-10">
          {(user.image) && (
            <img
              src={user.image}
              alt={user.name || username}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {user.name || username}
          </h1>
          <p className="text-gray-500 mt-1">Schedule a meeting</p>
        </div>

        {/* Event Types */}
        {user.eventTypes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No event types available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {user.eventTypes.map((eventType) => (
              <Link
                key={eventType.id}
                href={`/${username}/${eventType.slug}`}
                className="block bg-white rounded-lg border-l-4 shadow-sm p-6 hover:shadow-md transition-shadow"
                style={{ borderLeftColor: eventType.color }}
              >
                <h2 className="font-semibold text-gray-900">
                  {eventType.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {eventType.duration} min
                </p>
                {eventType.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {eventType.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-sm text-gray-400">
            Powered by <span className="font-semibold text-blue-600">MeetWhen</span>
          </p>
        </div>
      </div>
    </div>
  )
}
