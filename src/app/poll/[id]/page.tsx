"use client"

import { useEffect, useState, use } from "react"
import { Check, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface PollOption {
  id: string
  startTime: string
  endTime: string
  votes: { voterName: string; voterEmail: string; availability: string }[]
}

interface Poll {
  id: string
  title: string
  description?: string
  duration: number
  timezone: string
  status: string
  finalOptionId?: string
  creator: { name: string; email: string }
  options: PollOption[]
}

type Availability = "yes" | "maybe" | "no"

export default function VotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [voterName, setVoterName] = useState("")
  const [voterEmail, setVoterEmail] = useState("")
  const [votes, setVotes] = useState<Record<string, Availability>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/polls/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setPoll(data)
        // Initialize all to "no"
        if (data.options) {
          const initial: Record<string, Availability> = {}
          data.options.forEach((o: PollOption) => { initial[o.id] = "no" })
          setVotes(initial)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const cycleVote = (optionId: string) => {
    setVotes((prev) => {
      const current = prev[optionId]
      const next: Availability = current === "no" ? "yes" : current === "yes" ? "maybe" : "no"
      return { ...prev, [optionId]: next }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      const res = await fetch(`/api/polls/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voterName,
          voterEmail,
          votes: Object.entries(votes).map(([optionId, availability]) => ({
            optionId,
            availability,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(typeof data.error === "string" ? data.error : "Failed to submit votes")
      }

      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to submit your vote. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Poll not found</p>
      </div>
    )
  }

  if (poll.status !== "open") {
    const finalOption = poll.options.find((o) => o.id === poll.finalOptionId)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto py-12 px-4">
          <div className="text-center mb-8">
            <Link href="/">
              <Image src="/logo-full.svg" alt="letsmeet.link" width={130} height={32} className="mx-auto" />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{poll.title}</h1>
            <p className="text-gray-500 mb-4">This poll has been closed.</p>
            {finalOption && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700 font-medium">Selected time:</p>
                <p className="text-blue-900 font-semibold">
                  {formatDate(finalOption.startTime)} at {formatTime(finalOption.startTime)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto py-12 px-4">
          <div className="text-center mb-8">
            <Link href="/">
              <Image src="/logo-full.svg" alt="letsmeet.link" width={130} height={32} className="mx-auto" />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vote submitted!</h2>
            <p className="text-gray-500">Your availability has been recorded for &ldquo;{poll.title}&rdquo;.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/logo-full.svg" alt="letsmeet.link" width={130} height={32} className="mx-auto" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900">{poll.title}</h1>
          {poll.description && <p className="text-gray-500 mt-1">{poll.description}</p>}
          <p className="text-sm text-gray-400 mt-2">
            {poll.duration} min · Created by {poll.creator.name || poll.creator.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Time options */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Select your availability</h2>
            <p className="text-sm text-gray-500 mb-4">Click to cycle: <span className="text-green-600">Yes</span> → <span className="text-yellow-600">Maybe</span> → <span className="text-red-600">No</span></p>
            <div className="space-y-3">
              {poll.options.map((opt) => {
                const avail = votes[opt.id] || "no"
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => cycleVote(opt.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      avail === "yes"
                        ? "border-green-300 bg-green-50"
                        : avail === "maybe"
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{formatDate(opt.startTime)}</div>
                      <div className="text-sm text-gray-500">
                        {formatTime(opt.startTime)} – {formatTime(opt.endTime)}
                      </div>
                    </div>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      avail === "yes"
                        ? "bg-green-100 text-green-700"
                        : avail === "maybe"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {avail === "yes" ? "✓ Yes" : avail === "maybe" ? "? Maybe" : "✗ No"}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Voter info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Your info</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={voterEmail}
                onChange={(e) => setVoterEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#0066FF] text-white py-3 rounded-lg hover:bg-[#0052CC] transition-colors disabled:opacity-50 font-medium"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Vote
          </button>
        </form>
      </div>
    </div>
  )
}
