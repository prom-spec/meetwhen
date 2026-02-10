import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import prisma from "@/lib/prisma"
import PoweredByFooter from "@/components/PoweredByFooter"
import type { Metadata } from "next"

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, username: true },
  })
  
  if (!user) return { title: "User Not Found" }
  
  return {
    title: `${user.name || user.username} | letsmeet.link`,
    description: `Schedule a meeting with ${user.name || user.username} on letsmeet.link`,
  }
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
      {/* Header with Logo */}
      <header className="py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex opacity-60 hover:opacity-100 transition-opacity">
            <Image
              src="/logo-full.svg"
              alt="letsmeet.link"
              width={100}
              height={24}
            />
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* User Profile Header */}
        <div className="text-center mb-10">
          {user.image && (
            <Image
              src={user.image}
              alt={user.name || username}
              width={96}
              height={96}
              className="rounded-full mx-auto mb-4 object-cover border-4 border-white shadow-sm"
            />
          )}
          <h1 className="text-2xl font-bold text-[#1a1a2e]">
            {user.name || username}
          </h1>
          <p className="text-gray-500 mt-1">Select a meeting type to schedule</p>
        </div>

        {/* Event Types */}
        {user.eventTypes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No event types available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {user.eventTypes.map((eventType: { id: string; title: string; slug: string; duration: number; color: string; description: string | null }) => (
              <Link
                key={eventType.id}
                href={`/${username}/${eventType.slug}`}
                className="block bg-white rounded-lg border-l-4 shadow-sm p-5 hover:shadow-md transition-shadow group"
                style={{ borderLeftColor: eventType.color }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-[#1a1a2e] group-hover:text-[#0066FF] transition-colors">
                      {eventType.title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {eventType.duration} minutes
                    </p>
                    {eventType.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {eventType.description}
                      </p>
                    )}
                  </div>
                  <svg 
                    className="w-5 h-5 text-gray-400 group-hover:text-[#0066FF] transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <PoweredByFooter className="mt-12" />
      </div>
    </div>
  )
}
