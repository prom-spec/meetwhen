"use client"

import { useState, useEffect } from "react"
import { Plus, Copy, Trash2, Link as LinkIcon, Check, Clock, X } from "lucide-react"

interface OneOffLink {
  id: string
  slug: string
  title: string
  duration: number
  availableSlots: string
  expiresAt: string | null
  maxUses: number
  usedCount: number
  createdAt: string
  bookings: { id: string; guestName: string; guestEmail: string; slotTime: string }[]
}

function getStatus(link: OneOffLink): "active" | "used" | "expired" {
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) return "expired"
  if (link.usedCount >= link.maxUses) return "used"
  return "active"
}

const statusColors = {
  active: "bg-green-100 text-green-800",
  used: "bg-gray-100 text-gray-800",
  expired: "bg-red-100 text-red-800",
}

export default function OneOffLinksPage() {
  const [links, setLinks] = useState<OneOffLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [duration, setDuration] = useState(30)
  const [maxUses, setMaxUses] = useState(1)
  const [expiresAt, setExpiresAt] = useState("")
  const [slots, setSlots] = useState<string[]>([])
  const [newSlotDate, setNewSlotDate] = useState("")
  const [newSlotTime, setNewSlotTime] = useState("09:00")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchLinks()
  }, [])

  async function fetchLinks() {
    const res = await fetch("/api/one-off-links")
    if (res.ok) setLinks(await res.json())
    setLoading(false)
  }

  function addSlot() {
    if (!newSlotDate || !newSlotTime) return
    const dt = new Date(`${newSlotDate}T${newSlotTime}:00`)
    const iso = dt.toISOString()
    if (!slots.includes(iso)) {
      setSlots([...slots, iso].sort())
    }
  }

  function removeSlot(iso: string) {
    setSlots(slots.filter((s) => s !== iso))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (slots.length === 0) return
    setCreating(true)

    const res = await fetch("/api/one-off-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        duration,
        availableSlots: slots,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        maxUses,
      }),
    })

    if (res.ok) {
      setTitle("")
      setDuration(30)
      setMaxUses(1)
      setExpiresAt("")
      setSlots([])
      setShowCreate(false)
      fetchLinks()
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this one-off link?")) return
    const res = await fetch(`/api/one-off-links/${id}`, { method: "DELETE" })
    if (res.ok) setLinks(links.filter((l) => l.id !== id))
  }

  function copyLink(slug: string, id: string) {
    const url = `${window.location.origin}/meet/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066FF]" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">One-Off Meeting Links</h1>
          <p className="text-gray-500 mt-1">
            Create single-use meeting links with specific time slots
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-[#0052CC] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Link
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Quick coffee chat"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={5}
                max={480}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                min={1}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expires At (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Available Slots
            </label>
            <div className="flex gap-2 items-end">
              <input
                type="date"
                value={newSlotDate}
                onChange={(e) => setNewSlotDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              />
              <button
                type="button"
                onClick={addSlot}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
            {slots.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {slots.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    {new Date(s).toLocaleString()}
                    <button type="button" onClick={() => removeSlot(s)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {slots.length === 0 && (
              <p className="text-sm text-gray-400 mt-1">Add at least one time slot</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || slots.length === 0}
              className="px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-[#0052CC] disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Create Link"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {links.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No one-off links yet</h3>
          <p className="text-gray-500">Create your first one-off meeting link above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => {
            const status = getStatus(link)
            const slotsArr: string[] = JSON.parse(link.availableSlots)
            return (
              <div
                key={link.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{link.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[status]}`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {link.duration}min
                    </span>
                    <span>
                      {link.usedCount}/{link.maxUses} used
                    </span>
                    <span>{slotsArr.length} slot{slotsArr.length !== 1 ? "s" : ""}</span>
                  </div>
                  {link.bookings.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      {link.bookings.map((b) => (
                        <div key={b.id}>
                          📅 {b.guestName} ({b.guestEmail}) —{" "}
                          {new Date(b.slotTime).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => copyLink(link.slug, link.id)}
                    className="p-2 text-gray-400 hover:text-[#0066FF] transition-colors"
                    title="Copy link"
                  >
                    {copiedId === link.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
