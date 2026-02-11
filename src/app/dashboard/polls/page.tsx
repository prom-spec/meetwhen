"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, ExternalLink, Users, Clock, CheckCircle, Loader2 } from "lucide-react"

interface Poll {
  id: string
  title: string
  description?: string
  duration: number
  status: string
  createdAt: string
  options: { id: string; startTime: string; endTime: string }[]
  _count: { votes: number }
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/polls")
      .then((r) => r.json())
      .then(setPolls)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Polls</h1>
          <p className="text-gray-500 mt-1">Create polls to find the best meeting time</p>
        </div>
        <Link
          href="/dashboard/polls/new"
          className="inline-flex items-center gap-2 bg-[#0066FF] text-white px-4 py-2 rounded-lg hover:bg-[#0052CC] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Poll
        </Link>
      </div>

      {polls.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No polls yet</h3>
          <p className="text-gray-500 mb-6">Create a poll to let participants vote on the best meeting time.</p>
          <Link
            href="/dashboard/polls/new"
            className="inline-flex items-center gap-2 bg-[#0066FF] text-white px-4 py-2 rounded-lg hover:bg-[#0052CC] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create your first poll
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {polls.map((poll) => (
            <div key={poll.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-[#0066FF]/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{poll.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      poll.status === "open"
                        ? "bg-green-100 text-green-700"
                        : poll.status === "closed"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {poll.status}
                    </span>
                  </div>
                  {poll.description && (
                    <p className="text-gray-500 mt-1 text-sm">{poll.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {poll.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {poll.options.length} options
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {poll._count.votes} votes
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/poll/${poll.id}`}
                    target="_blank"
                    className="text-gray-400 hover:text-[#0066FF] p-2"
                    title="Open voting page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/dashboard/polls/${poll.id}`}
                    className="text-sm font-medium text-[#0066FF] hover:text-[#0052CC] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Results
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
