"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { Copy, Check, ExternalLink, Loader2, Lock } from "lucide-react"

interface PollOption {
  id: string
  startTime: string
  endTime: string
  votes: Vote[]
}

interface Vote {
  id: string
  optionId: string
  voterName: string
  voterEmail: string
  availability: string
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
  votes: Vote[]
}

export default function PollResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    fetch(`/api/polls/${id}`)
      .then((r) => r.json())
      .then(setPoll)
      .finally(() => setLoading(false))
  }, [id])

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/poll/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const closePoll = async (finalOptionId?: string) => {
    setClosing(true)
    try {
      const res = await fetch(`/api/polls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed", finalOptionId }),
      })
      if (res.ok) {
        const updated = await res.json()
        setPoll(updated)
      }
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  if (!poll) {
    return <div className="text-center py-20 text-gray-500">Poll not found</div>
  }

  // Collect unique voters
  const voters = Array.from(
    new Map(poll.votes.map((v) => [v.voterEmail, { name: v.voterName, email: v.voterEmail }])).values()
  )

  // Count yes votes per option
  const yesCounts = poll.options.map((opt) => ({
    optionId: opt.id,
    yes: opt.votes.filter((v) => v.availability === "yes").length,
    maybe: opt.votes.filter((v) => v.availability === "maybe").length,
  }))

  const bestOption = yesCounts.reduce((best, curr) =>
    curr.yes > best.yes || (curr.yes === best.yes && curr.maybe > best.maybe) ? curr : best
  , yesCounts[0])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{poll.title}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              poll.status === "open"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}>
              {poll.status}
            </span>
          </div>
          {poll.description && <p className="text-gray-500 mt-1">{poll.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-2 text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
          <Link
            href={`/poll/${id}`}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Vote page
          </Link>
        </div>
      </div>

      {/* Share link card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-700 font-medium mb-1">Share this link with participants:</p>
        <code className="text-sm text-blue-900 bg-blue-100 px-2 py-1 rounded break-all">
          {typeof window !== "undefined" ? `${window.location.origin}/poll/${id}` : `/poll/${id}`}
        </code>
      </div>

      {/* Results matrix */}
      {voters.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No votes yet. Share the link to start collecting responses.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-medium text-gray-700 sticky left-0 bg-white min-w-[140px]">
                    Participant
                  </th>
                  {poll.options.map((opt) => (
                    <th
                      key={opt.id}
                      className={`text-center p-3 font-medium min-w-[120px] ${
                        bestOption?.optionId === opt.id && poll.status === "open"
                          ? "bg-green-50 text-green-800"
                          : poll.finalOptionId === opt.id
                          ? "bg-blue-50 text-blue-800"
                          : "text-gray-700"
                      }`}
                    >
                      <div>{formatDate(opt.startTime)}</div>
                      <div className="text-xs font-normal text-gray-500">{formatTime(opt.startTime)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {voters.map((voter) => (
                  <tr key={voter.email} className="border-b border-gray-100 last:border-0">
                    <td className="p-3 sticky left-0 bg-white">
                      <div className="font-medium text-gray-900">{voter.name}</div>
                      <div className="text-xs text-gray-400">{voter.email}</div>
                    </td>
                    {poll.options.map((opt) => {
                      const vote = opt.votes.find((v) => v.voterEmail === voter.email)
                      const avail = vote?.availability || "no"
                      return (
                        <td key={opt.id} className="text-center p-3">
                          <span className={`inline-block w-8 h-8 rounded-full leading-8 text-xs font-medium ${
                            avail === "yes"
                              ? "bg-green-100 text-green-700"
                              : avail === "maybe"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {avail === "yes" ? "✓" : avail === "maybe" ? "?" : "✗"}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-gray-50 font-medium">
                  <td className="p-3 sticky left-0 bg-gray-50 text-gray-700">Totals</td>
                  {yesCounts.map((c) => (
                    <td key={c.optionId} className="text-center p-3">
                      <span className="text-green-600">{c.yes} yes</span>
                      {c.maybe > 0 && (
                        <span className="text-yellow-600 ml-1">· {c.maybe} maybe</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Close poll */}
      {poll.status === "open" && voters.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Close Poll
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Select the winning option and close the poll. The best option (most yes votes) is pre-selected.
          </p>
          <div className="flex flex-wrap gap-2">
            {poll.options.map((opt) => {
              const counts = yesCounts.find((c) => c.optionId === opt.id)
              const isBest = bestOption?.optionId === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => closePoll(opt.id)}
                  disabled={closing}
                  className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                    isBest
                      ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {formatDate(opt.startTime)} {formatTime(opt.startTime)}
                  <span className="ml-1 text-xs">({counts?.yes} yes)</span>
                  {isBest && <span className="ml-1 text-xs">★</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
