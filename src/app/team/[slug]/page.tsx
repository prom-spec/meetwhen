import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import prisma from "@/lib/prisma"
import type { Metadata } from "next"
import { Users, User, RefreshCw } from "lucide-react"
import PoweredByFooter from "@/components/PoweredByFooter"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const team = await prisma.team.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  })
  
  if (!team) return { title: "Team Not Found" }
  
  return {
    title: `${team.name} | MeetWhen`,
    description: `Schedule a meeting with ${team.name} on MeetWhen`,
  }
}

export default async function TeamProfilePage({ params }: PageProps) {
  const { slug } = await params
  
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { priority: "asc" },
      },
      eventTypes: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!team) {
    notFound()
  }

  const getSchedulingIcon = (schedulingType: string) => {
    switch (schedulingType) {
      case "ROUND_ROBIN":
        return <RefreshCw className="w-4 h-4" />
      case "COLLECTIVE":
        return <Users className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getSchedulingLabel = (schedulingType: string) => {
    switch (schedulingType) {
      case "ROUND_ROBIN":
        return "Round Robin"
      case "COLLECTIVE":
        return "Collective"
      default:
        return "Individual"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
      <header className="py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex opacity-60 hover:opacity-100 transition-opacity">
            <Image
              src="/logo-full.svg"
              alt="MeetWhen"
              width={100}
              height={24}
            />
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Team Profile Header */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-sm">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">
            {team.name}
          </h1>
          <p className="text-gray-500 mt-1">Select a meeting type to schedule</p>
          
          {/* Team Members Preview */}
          <div className="flex items-center justify-center gap-1 mt-4">
            {team.members.slice(0, 5).map((member, index) => (
              <div
                key={member.userId}
                className="relative"
                style={{ marginLeft: index > 0 ? "-8px" : "0", zIndex: 5 - index }}
              >
                {member.user.image ? (
                  <Image
                    src={member.user.image}
                    alt={member.user.name || "Team member"}
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-white"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                    {(member.user.name || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {team.members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600" style={{ marginLeft: "-8px" }}>
                +{team.members.length - 5}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">{team.members.length} team members</p>
        </div>

        {/* Event Types */}
        {team.eventTypes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No event types available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {team.eventTypes.map((eventType) => (
              <Link
                key={eventType.id}
                href={`/team/${slug}/${eventType.slug}`}
                className="block bg-white rounded-lg border-l-4 shadow-sm p-5 hover:shadow-md transition-shadow group"
                style={{ borderLeftColor: eventType.color }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-[#1a1a2e] group-hover:text-[#0066FF] transition-colors">
                        {eventType.title}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {getSchedulingIcon(eventType.schedulingType)}
                        {getSchedulingLabel(eventType.schedulingType)}
                      </span>
                    </div>
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
                    className="w-5 h-5 text-gray-400 group-hover:text-[#0066FF] transition-colors ml-4" 
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
