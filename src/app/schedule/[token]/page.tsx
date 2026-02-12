"use client"

import { useState, useEffect, use } from "react"
import { Clock, AlertCircle } from "lucide-react"
import Link from "next/link"

interface HostData {
  id: string
  name: string | null
  username: string | null
  timezone: string
  image: string | null
  eventTypes: {
    id: string
    title: string
    slug: string
    duration: number
    color: string
    description: string | null
  }[]
}

interface LinkData {
  contactName: string
  contactEmail: string | null
  host: HostData
}

export default function SchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<LinkData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/personal-links/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          setError("This link is not valid.")
          return
        }
        setData(await res.json())
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Unavailable</h1>
          <p className="text-gray-500">{error || "Not found"}</p>
        </div>
      </div>
    )
  }

  const { contactName, contactEmail, host } = data

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4 text-center">
          {host.image && (
            <img
              src={host.image}
              alt={host.name || "Host"}
              className="w-16 h-16 rounded-full mx-auto mb-3"
            />
          )}
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Hi {contactName}, pick a time with {host.name || "your host"}
          </h1>
          <p className="text-gray-500 text-sm">
            Choose an event type below to schedule a meeting
          </p>
        </div>

        {host.eventTypes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
            No event types available right now.
          </div>
        ) : (
          <div className="space-y-3">
            {host.eventTypes.map((et) => (
              <Link
                key={et.id}
                href={`/${host.username}/${et.slug}?name=${encodeURIComponent(contactName)}&email=${encodeURIComponent(contactEmail || "")}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-[#0066FF] hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-10 rounded-full"
                    style={{ backgroundColor: et.color }}
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{et.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {et.duration} min
                    </div>
                    {et.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">{et.description}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
