"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Loader2, Mail, Power, Pencil } from "lucide-react"
import Link from "next/link"
import PlanGate from "@/components/PlanGate"

interface EmailSequence {
  id: string
  name: string
  trigger: string
  delayMinutes: number
  subject: string
  body: string
  enabled: boolean
  createdAt: string
}

const TRIGGERS = [
  { value: "after_booking", label: "After Booking Confirmed", icon: "📅" },
  { value: "after_meeting", label: "After Meeting Ends", icon: "✅" },
  { value: "no_show", label: "No-Show Follow Up", icon: "👻" },
]

const TEMPLATE_VARS = [
  "{{guestName}}", "{{eventTitle}}", "{{meetingDate}}", "{{hostName}}", "{{bookingUrl}}",
]

export default function SequencesPage() {
  const [sequences, setSequences] = useState<EmailSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", trigger: "after_meeting", delayMinutes: 60, subject: "", body: "" })

  const fetchSequences = useCallback(async () => {
    const res = await fetch("/api/sequences")
    if (res.ok) setSequences(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchSequences() }, [fetchSequences])

  const resetForm = () => {
    setForm({ name: "", trigger: "after_meeting", delayMinutes: 60, subject: "", body: "" })
    setShowCreate(false)
    setEditingId(null)
  }

  const handleSave = async () => {
    const url = editingId ? `/api/sequences/${editingId}` : "/api/sequences"
    const method = editingId ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await fetchSequences()
      resetForm()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sequence?")) return
    await fetch(`/api/sequences/${id}`, { method: "DELETE" })
    await fetchSequences()
  }

  const toggleEnabled = async (seq: EmailSequence) => {
    await fetch(`/api/sequences/${seq.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !seq.enabled }),
    })
    await fetchSequences()
  }

  const startEdit = (seq: EmailSequence) => {
    setForm({ name: seq.name, trigger: seq.trigger, delayMinutes: seq.delayMinutes, subject: seq.subject, body: seq.body })
    setEditingId(seq.id)
    setShowCreate(true)
  }

  const formatDelay = (min: number) => {
    if (min < 60) return `${min} min`
    if (min < 1440) return `${Math.round(min / 60)}h`
    return `${Math.round(min / 1440)}d`
  }

  return (
    <PlanGate feature="sequences" featureLabel="Email Sequences" description="Send automated email sequences before and after meetings.">
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#1a1a2e]">Email Sequences</h1>
            <Link href="/dashboard/workflows" className="text-sm text-blue-600 hover:underline">← Workflows</Link>
          </div>
          <p className="text-sm text-gray-500 mt-1">Automated follow-up emails after meetings</p>
        </div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#0066FF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0052CC]">
            <Plus className="w-4 h-4" /> New Sequence
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">{editingId ? "Edit" : "Create"} Sequence</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Post-meeting follow up" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
                <select value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delay (minutes)</label>
                <input type="number" value={form.delayMinutes} onChange={e => setForm({ ...form, delayMinutes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Thanks for meeting with us!" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={5} placeholder="Hi {{guestName}},&#10;&#10;Thanks for booking {{eventTitle}}..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
              <div className="flex flex-wrap gap-1 mt-2">
                {TEMPLATE_VARS.map(v => (
                  <button key={v} onClick={() => setForm({ ...form, body: form.body + v })} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-mono">{v}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={!form.name || !form.subject || !form.body} className="bg-[#0066FF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0052CC] disabled:opacity-50">
                {editingId ? "Update" : "Create"} Sequence
              </button>
              <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-2">No email sequences yet</h3>
          <p className="text-sm text-gray-400 mb-4">Create automated follow-up emails for after meetings</p>
          {!showCreate && (
            <button onClick={() => setShowCreate(true)} className="bg-[#0066FF] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0052CC]">
              Create your first sequence
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map(seq => {
            const trigger = TRIGGERS.find(t => t.value === seq.trigger)
            return (
              <div key={seq.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleEnabled(seq)} className={`p-2 rounded-lg ${seq.enabled ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}>
                    <Power className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="font-medium text-[#1a1a2e]">{seq.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {trigger?.icon} {trigger?.label} · {formatDelay(seq.delayMinutes)} delay · Subject: &quot;{seq.subject}&quot;
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(seq)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(seq.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
    </PlanGate>
  )
}
