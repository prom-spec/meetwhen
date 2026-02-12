"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, Zap, Mail, Globe, Clock, Power } from "lucide-react"
import Link from "next/link"

interface WorkflowStep {
  id?: string
  order: number
  action: "SEND_EMAIL" | "SEND_WEBHOOK" | "WAIT"
  delay: number
  config: Record<string, unknown>
}

interface Workflow {
  id: string
  name: string
  isActive: boolean
  trigger: string
  steps: WorkflowStep[]
  _count?: { executions: number }
  createdAt: string
}

const TRIGGERS = [
  { value: "BOOKING_CREATED", label: "Booking Created", icon: "📅" },
  { value: "BOOKING_CANCELLED", label: "Booking Cancelled", icon: "❌" },
  { value: "BOOKING_RESCHEDULED", label: "Booking Rescheduled", icon: "🔄" },
  { value: "BEFORE_MEETING", label: "Before Meeting", icon: "⏰" },
  { value: "AFTER_MEETING", label: "After Meeting", icon: "✅" },
]

const ACTIONS = [
  { value: "SEND_EMAIL", label: "Send Email", icon: Mail },
  { value: "SEND_WEBHOOK", label: "Send Webhook", icon: Globe },
  { value: "WAIT", label: "Wait / Delay", icon: Clock },
]

const TEMPLATE_VARS = [
  "{{guest_name}}", "{{host_name}}", "{{event_title}}",
  "{{meeting_time}}", "{{meeting_url}}", "{{booking_url}}",
]

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const fetchWorkflows = useCallback(async () => {
    const res = await fetch("/api/workflows")
    if (res.ok) setWorkflows(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchWorkflows() }, [fetchWorkflows])

  const toggleWorkflow = async (id: string, isActive: boolean) => {
    await fetch(`/api/workflows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    })
    setWorkflows((ws) => ws.map((w) => w.id === id ? { ...w, isActive: !isActive } : w))
  }

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Delete this workflow?")) return
    await fetch(`/api/workflows/${id}`, { method: "DELETE" })
    setWorkflows((ws) => ws.filter((w) => w.id !== id))
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-500 mt-1">Automate emails, webhooks, and more when events happen.</p>
          <Link href="/dashboard/workflows/sequences" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1"><Mail className="w-3.5 h-3.5" /> Email Sequences →</Link>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#0066FF] text-white px-4 py-2 rounded-lg hover:bg-[#0052CC] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {showCreate && (
        <WorkflowEditor
          onSave={async (data) => {
            const res = await fetch("/api/workflows", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            })
            if (res.ok) {
              setShowCreate(false)
              fetchWorkflows()
            }
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="space-y-3">
        {workflows.map((w) => (
          <div key={w.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleWorkflow(w.id, w.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    w.isActive ? "bg-[#0066FF]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      w.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{w.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {TRIGGERS.find((t) => t.value === w.trigger)?.icon}{" "}
                      {TRIGGERS.find((t) => t.value === w.trigger)?.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {w.steps.length} step{w.steps.length !== 1 ? "s" : ""}
                    {w._count?.executions ? ` · ${w._count.executions} runs` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingId(editingId === w.id ? null : w.id)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  {editingId === w.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteWorkflow(w.id)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editingId === w.id && (
              <div className="border-t border-gray-100 p-4">
                <WorkflowEditor
                  initialData={w}
                  onSave={async (data) => {
                    const res = await fetch(`/api/workflows/${w.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    })
                    if (res.ok) {
                      setEditingId(null)
                      fetchWorkflows()
                    }
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}
          </div>
        ))}

        {workflows.length === 0 && !showCreate && (
          <div className="text-center py-12 text-gray-500">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No workflows yet</p>
            <p className="text-sm mt-1">Create your first automation to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function WorkflowEditor({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: Workflow
  onSave: (data: { name: string; trigger: string; steps: WorkflowStep[] }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initialData?.name || "")
  const [trigger, setTrigger] = useState(initialData?.trigger || "BOOKING_CREATED")
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initialData?.steps || [{ order: 1, action: "SEND_EMAIL", delay: 0, config: { subject: "", body: "" } }]
  )
  const [saving, setSaving] = useState(false)

  const addStep = () => {
    const nextOrder = Math.max(...steps.map((s) => s.order), 0) + 1
    setSteps([...steps, { order: nextOrder, action: "SEND_EMAIL", delay: 0, config: { subject: "", body: "" } }])
  }

  const removeStep = (order: number) => {
    setSteps(steps.filter((s) => s.order !== order))
  }

  const updateStep = (order: number, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map((s) => {
      if (s.order !== order) return s
      const updated = { ...s, ...updates }
      // Reset config when action changes
      if (updates.action && updates.action !== s.action) {
        if (updates.action === "SEND_EMAIL") updated.config = { subject: "", body: "" }
        else if (updates.action === "SEND_WEBHOOK") updated.config = { url: "", method: "POST" }
        else updated.config = {}
      }
      return updated
    }))
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name, trigger, steps })
    setSaving(false)
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workflow"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#0066FF] focus:border-[#0066FF]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#0066FF] focus:border-[#0066FF]"
          >
            {TRIGGERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Steps</label>
          <button
            onClick={addStep}
            className="text-xs text-[#0066FF] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Step
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <StepEditor
              key={step.order}
              step={step}
              index={idx}
              onUpdate={(updates) => updateStep(step.order, updates)}
              onRemove={() => removeStep(step.order)}
              canRemove={steps.length > 1}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="bg-[#0066FF] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0052CC] disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {initialData ? "Update" : "Create"} Workflow
        </button>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function StepEditor({
  step,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  step: WorkflowStep
  index: number
  onUpdate: (updates: Partial<WorkflowStep>) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const ActionIcon = ACTIONS.find((a) => a.value === step.action)?.icon || Zap

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-xs flex items-center justify-center">
            {index + 1}
          </span>
          <ActionIcon className="w-4 h-4 text-gray-400" />
          <select
            value={step.action}
            onChange={(e) => onUpdate({ action: e.target.value as WorkflowStep["action"] })}
            className="text-sm border-0 bg-transparent font-medium text-gray-700 focus:ring-0 p-0"
          >
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Delay:</label>
          <input
            type="number"
            min={0}
            value={step.delay}
            onChange={(e) => onUpdate({ delay: parseInt(e.target.value) || 0 })}
            className="w-16 px-2 py-1 border border-gray-200 rounded text-xs"
          />
          <span className="text-xs text-gray-500">min</span>
          {canRemove && (
            <button onClick={onRemove} className="text-gray-400 hover:text-red-500 ml-1">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {step.action === "SEND_EMAIL" && (
        <div className="space-y-2">
          <input
            type="text"
            value={(step.config.subject as string) || ""}
            onChange={(e) => onUpdate({ config: { ...step.config, subject: e.target.value } })}
            placeholder="Email subject..."
            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
          />
          <textarea
            value={(step.config.body as string) || ""}
            onChange={(e) => onUpdate({ config: { ...step.config, body: e.target.value } })}
            placeholder="Email body..."
            rows={4}
            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm font-mono"
          />
          <div className="flex flex-wrap gap-1">
            {TEMPLATE_VARS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  onUpdate({ config: { ...step.config, body: ((step.config.body as string) || "") + v } })
                }}
                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {step.action === "SEND_WEBHOOK" && (
        <div className="space-y-2">
          <input
            type="url"
            value={(step.config.url as string) || ""}
            onChange={(e) => onUpdate({ config: { ...step.config, url: e.target.value } })}
            placeholder="https://example.com/webhook"
            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
          />
          <select
            value={(step.config.method as string) || "POST"}
            onChange={(e) => onUpdate({ config: { ...step.config, method: e.target.value } })}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm"
          >
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
          </select>
        </div>
      )}

      {step.action === "WAIT" && (
        <p className="text-xs text-gray-500">
          This step adds a delay before the next step executes. Set the delay above.
        </p>
      )}
    </div>
  )
}
