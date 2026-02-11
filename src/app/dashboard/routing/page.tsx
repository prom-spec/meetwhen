"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Copy, ExternalLink, ChevronDown, ChevronUp, GripVertical, Loader2, ArrowRight, Share2 } from "lucide-react"
import { useToast } from "@/components/ToastProvider"
import ConfirmDialog from "@/components/ConfirmDialog"

interface Field {
  id?: string
  label: string
  type: string
  required: boolean
  options: string | null
  order: number
}

interface Rule {
  id?: string
  fieldId: string
  operator: string
  value: string
  eventTypeId: string
  order: number
}

interface RoutingForm {
  id: string
  title: string
  description: string | null
  fallbackEventTypeId: string | null
  fields: Field[]
  rules: Rule[]
  createdAt: string
}

interface EventType {
  id: string
  title: string
  slug: string
}

export default function RoutingFormsPage() {
  const [forms, setForms] = useState<RoutingForm[]>([])
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingForm, setEditingForm] = useState<RoutingForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { showToast } = useToast()

  // Form builder state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [fallbackEventTypeId, setFallbackEventTypeId] = useState("")
  const [fields, setFields] = useState<Field[]>([])
  const [rules, setRules] = useState<Rule[]>([])

  const loadForms = useCallback(async () => {
    const res = await fetch("/api/routing-forms")
    if (res.ok) setForms(await res.json())
    setLoading(false)
  }, [])

  const loadEventTypes = useCallback(async () => {
    const res = await fetch("/api/event-types")
    if (res.ok) {
      const data = await res.json()
      setEventTypes(Array.isArray(data) ? data : data.eventTypes || [])
    }
  }, [])

  useEffect(() => { loadForms(); loadEventTypes() }, [loadForms, loadEventTypes])

  function resetBuilder() {
    setTitle(""); setDescription(""); setFallbackEventTypeId("")
    setFields([]); setRules([]); setEditingForm(null); setShowBuilder(false)
  }

  function openEdit(form: RoutingForm) {
    setTitle(form.title)
    setDescription(form.description || "")
    setFallbackEventTypeId(form.fallbackEventTypeId || "")
    setFields(form.fields.map(f => ({ ...f })))
    setRules(form.rules.map(r => ({ ...r })))
    setEditingForm(form)
    setShowBuilder(true)
  }

  function addField() {
    setFields([...fields, { label: "", type: "text", required: true, options: null, order: fields.length }])
  }

  function updateField(index: number, updates: Partial<Field>) {
    setFields(fields.map((f, i) => i === index ? { ...f, ...updates } : f))
  }

  function removeField(index: number) {
    const removed = fields[index]
    setFields(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })))
    if (removed.id) {
      setRules(rules.filter(r => r.fieldId !== removed.id))
    }
  }

  function moveField(index: number, direction: -1 | 1) {
    const newFields = [...fields]
    const target = index + direction
    if (target < 0 || target >= newFields.length) return
    ;[newFields[index], newFields[target]] = [newFields[target], newFields[index]]
    setFields(newFields.map((f, i) => ({ ...f, order: i })))
  }

  function addRule() {
    setRules([...rules, { fieldId: "", operator: "equals", value: "", eventTypeId: "", order: rules.length }])
  }

  function updateRule(index: number, updates: Partial<Rule>) {
    setRules(rules.map((r, i) => i === index ? { ...r, ...updates } : r))
  }

  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index).map((r, i) => ({ ...r, order: i })))
  }

  async function handleSave() {
    if (!title.trim()) { showToast("Title is required", "error"); return }
    if (fields.length === 0) { showToast("Add at least one field", "error"); return }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        fallbackEventTypeId: fallbackEventTypeId || null,
        fields: fields.map((f, i) => ({
          ...(f.id ? { id: f.id } : {}),
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.type === "select" ? f.options : null,
          order: i,
        })),
        rules: rules.map((r, i) => ({
          fieldId: r.fieldId,
          operator: r.operator,
          value: r.value,
          eventTypeId: r.eventTypeId,
          order: i,
        })),
      }

      if (editingForm) {
        const res = await fetch(`/api/routing-forms/${editingForm.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to update")
        showToast("Routing form updated!", "success")
      } else {
        // For new forms, use fieldIndex for rules
        const createPayload = {
          title: payload.title,
          description: payload.description,
          fallbackEventTypeId: payload.fallbackEventTypeId,
          fields: payload.fields,
          rules: rules.map((r, i) => {
            const fieldIdx = fields.findIndex(f => f === fields.find((_, fi) => {
              // Match by temp tracking - for new forms, fieldId won't exist yet
              return fields[fi] && !fields[fi].id && `temp-${fi}` === r.fieldId
            }))
            return {
              fieldIndex: r.fieldId.startsWith("temp-") ? parseInt(r.fieldId.replace("temp-", "")) : undefined,
              fieldId: r.fieldId.startsWith("temp-") ? undefined : r.fieldId,
              operator: r.operator,
              value: r.value,
              eventTypeId: r.eventTypeId,
              order: i,
            }
          }),
        }
        const res = await fetch("/api/routing-forms", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createPayload),
        })
        if (!res.ok) throw new Error("Failed to create")
        showToast("Routing form created!", "success")
      }
      resetBuilder()
      loadForms()
    } catch {
      showToast("Failed to save routing form", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    const res = await fetch(`/api/routing-forms/${deleteId}`, { method: "DELETE" })
    if (res.ok) {
      showToast("Routing form deleted", "success")
      loadForms()
    } else {
      showToast("Failed to delete", "error")
    }
    setDeleteId(null)
  }

  function copyShareLink(formId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/route/${formId}`)
    showToast("Share link copied!", "success")
  }

  function getFieldId(field: Field, index: number): string {
    return field.id || `temp-${index}`
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
          <h1 className="text-2xl font-bold text-gray-900">Routing Forms</h1>
          <p className="text-gray-500 mt-1">Create forms that route visitors to different event types based on their answers.</p>
        </div>
        {!showBuilder && (
          <button
            onClick={() => { resetBuilder(); setShowBuilder(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-[#0055DD] transition-colors"
          >
            <Plus className="w-4 h-4" /> New Form
          </button>
        )}
      </div>

      {showBuilder && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingForm ? "Edit" : "Create"} Routing Form</h2>

          {/* Title & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                placeholder="e.g., Schedule a Meeting"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={description} onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                placeholder="Brief description for visitors"
              />
            </div>
          </div>

          {/* Fields */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Form Fields</h3>
              <button onClick={addField} className="text-sm text-[#0066FF] hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Field
              </button>
            </div>
            {fields.length === 0 && (
              <p className="text-gray-400 text-sm py-4 text-center border border-dashed border-gray-300 rounded-lg">
                No fields yet. Add a field to get started.
              </p>
            )}
            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-col gap-1 pt-2">
                    <button onClick={() => moveField(i, -1)} className="text-gray-400 hover:text-gray-600" disabled={i === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveField(i, 1)} className="text-gray-400 hover:text-gray-600" disabled={i === fields.length - 1}>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="md:col-span-2">
                      <input
                        value={field.label} onChange={e => updateField(i, { label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                        placeholder="Question label"
                      />
                    </div>
                    <select
                      value={field.type} onChange={e => updateField(i, { type: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                    >
                      <option value="text">Text</option>
                      <option value="select">Select</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="textarea">Textarea</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-sm text-gray-600">
                        <input type="checkbox" checked={field.required} onChange={e => updateField(i, { required: e.target.checked })} className="rounded" />
                        Required
                      </label>
                      <button onClick={() => removeField(i)} className="text-red-400 hover:text-red-600 ml-auto">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {field.type === "select" && (
                      <div className="md:col-span-4">
                        <input
                          value={field.options || ""} onChange={e => updateField(i, { options: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                          placeholder='Options as JSON array: ["Sales","Support","Partnership"]'
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Routing Rules */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Routing Rules</h3>
              <button onClick={addRule} className="text-sm text-[#0066FF] hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Rule
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">Rules are evaluated in order. First match wins.</p>
            {rules.length === 0 && (
              <p className="text-gray-400 text-sm py-4 text-center border border-dashed border-gray-300 rounded-lg">
                No rules yet. Add rules to route visitors based on their answers.
              </p>
            )}
            <div className="space-y-3">
              {rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg flex-wrap">
                  <span className="text-sm text-gray-500 font-medium">If</span>
                  <select
                    value={rule.fieldId} onChange={e => updateRule(i, { fieldId: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[120px] focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                  >
                    <option value="">Select field...</option>
                    {fields.map((f, fi) => (
                      <option key={fi} value={getFieldId(f, fi)}>{f.label || `Field ${fi + 1}`}</option>
                    ))}
                  </select>
                  <select
                    value={rule.operator} onChange={e => updateRule(i, { operator: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                  >
                    <option value="equals">equals</option>
                    <option value="contains">contains</option>
                    <option value="any">any value</option>
                  </select>
                  {rule.operator !== "any" && (
                    <input
                      value={rule.value} onChange={e => updateRule(i, { value: e.target.value })}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[100px] focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                      placeholder="Value"
                    />
                  )}
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <select
                    value={rule.eventTypeId} onChange={e => updateRule(i, { eventTypeId: e.target.value })}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-[140px] focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                  >
                    <option value="">Select event type...</option>
                    {eventTypes.map(et => (
                      <option key={et.id} value={et.id}>{et.title}</option>
                    ))}
                  </select>
                  <button onClick={() => removeRule(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Fallback */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fallback Event Type</label>
            <p className="text-xs text-gray-400 mb-2">Used when no routing rules match.</p>
            <select
              value={fallbackEventTypeId} onChange={e => setFallbackEventTypeId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full max-w-md focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
            >
              <option value="">None</option>
              {eventTypes.map(et => (
                <option key={et.id} value={et.id}>{et.title}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-[#0055DD] transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingForm ? "Update" : "Create"} Form
            </button>
            <button onClick={resetBuilder} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Forms List */}
      {forms.length === 0 && !showBuilder ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowRight className="w-8 h-8 text-[#0066FF]" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No routing forms yet</h3>
          <p className="text-gray-500 mb-4">Create a form to route visitors to different event types.</p>
          <button
            onClick={() => { resetBuilder(); setShowBuilder(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-[#0055DD]"
          >
            <Plus className="w-4 h-4" /> Create Your First Form
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map(form => (
            <div key={form.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">{form.title}</h3>
                {form.description && <p className="text-sm text-gray-500 truncate">{form.description}</p>}
                <p className="text-xs text-gray-400 mt-1">{form.fields.length} fields · {form.rules.length} rules</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => copyShareLink(form.id)} className="p-2 text-gray-400 hover:text-[#0066FF] rounded-lg hover:bg-gray-50" title="Copy share link">
                  <Share2 className="w-4 h-4" />
                </button>
                <a href={`/route/${form.id}`} target="_blank" className="p-2 text-gray-400 hover:text-[#0066FF] rounded-lg hover:bg-gray-50" title="Preview">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => openEdit(form)} className="px-3 py-1.5 text-sm text-[#0066FF] hover:bg-blue-50 rounded-lg">
                  Edit
                </button>
                <button onClick={() => setDeleteId(form.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Routing Form"
        message="Are you sure? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
