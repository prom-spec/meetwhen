"use client"

import { useState } from "react"
import { ArrowLeft, Upload, Check, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"

interface CalendlyEventType {
  uri: string
  name: string
  slug: string
  duration: number
  active: boolean
  kind: string
  secret: boolean
  description: string | null
  color: string
  location: string | null
  questionsCount: number
}

type Step = "api-key" | "select" | "importing" | "done"

export default function ImportPage() {
  const [step, setStep] = useState<Step>("api-key")
  const [apiKey, setApiKey] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [eventTypes, setEventTypes] = useState<CalendlyEventType[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [calendlyName, setCalendlyName] = useState("")
  const [results, setResults] = useState<{
    imported: { name: string; slug: string }[]
    errors: { name: string; error: string }[]
  } | null>(null)

  const fetchEventTypes = async () => {
    setError("")
    setLoading(true)
    try {
      const resp = await fetch("/api/import/calendly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || "Failed to connect to Calendly")
        return
      }
      setEventTypes(data.eventTypes)
      setCalendlyName(data.calendlyName || "")
      setSelected(new Set(data.eventTypes.filter((et: CalendlyEventType) => et.active).map((et: CalendlyEventType) => et.uri)))
      setStep("select")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const importSelected = async () => {
    setStep("importing")
    setError("")
    try {
      const resp = await fetch("/api/import/calendly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, selectedEventTypes: Array.from(selected) }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || "Import failed")
        setStep("select")
        return
      }
      setResults(data)
      setStep("done")
    } catch {
      setError("Network error during import")
      setStep("select")
    }
  }

  const toggleAll = () => {
    if (selected.size === eventTypes.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(eventTypes.map((et) => et.uri)))
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/settings" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Import from Calendly</h1>
        <p className="text-gray-600 mt-1">Bring your event types, custom questions, and settings from Calendly.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: API Key */}
      {step === "api-key" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-lg mb-4">Connect your Calendly account</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Calendly Personal Access Token</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="eyJraWQiOi..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
            />
          </div>
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">How to get your API token:</p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noopener noreferrer" className="underline">Calendly Integrations → API &amp; Webhooks</a></li>
              <li>Click &quot;Generate New Token&quot;</li>
              <li>Copy and paste it above</li>
            </ol>
            <p className="text-xs text-blue-600 mt-2">Your token is only used during import and is never stored.</p>
          </div>
          <button
            onClick={fetchEventTypes}
            disabled={!apiKey.trim() || loading}
            className="w-full py-3 bg-[#0066FF] text-white font-medium rounded-lg hover:bg-[#0052cc] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Connect &amp; Fetch Event Types
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Select event types */}
      {step === "select" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">Select event types to import</h2>
              {calendlyName && <p className="text-sm text-gray-500">From: {calendlyName}</p>}
            </div>
            <button onClick={toggleAll} className="text-sm text-[#0066FF] hover:underline">
              {selected.size === eventTypes.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          {eventTypes.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No event types found in your Calendly account.</p>
          ) : (
            <div className="space-y-3 mb-6">
              {eventTypes.map((et) => (
                <label
                  key={et.uri}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    selected.has(et.uri) ? "border-[#0066FF] bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(et.uri)}
                    onChange={() => {
                      const next = new Set(selected)
                      next.has(et.uri) ? next.delete(et.uri) : next.add(et.uri)
                      setSelected(next)
                    }}
                    className="mt-1 rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: et.color }} />
                      <span className="font-medium text-[#1a1a2e] truncate">{et.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{et.duration} min</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {!et.active && <span className="text-amber-600">Inactive</span>}
                      {et.secret && <span>Unlisted</span>}
                      {et.kind === "group" && <span>Group</span>}
                      {et.questionsCount > 0 && <span>{et.questionsCount} questions</span>}
                      {et.location && <span>{et.location.replace(/_/g, " ")}</span>}
                    </div>
                    {et.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{et.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("api-key")}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={importSelected}
              disabled={selected.size === 0}
              className="flex-1 py-2.5 bg-[#0066FF] text-white font-medium rounded-lg hover:bg-[#0052cc] disabled:opacity-50 transition-colors"
            >
              Import {selected.size} event type{selected.size !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === "importing" && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0066FF] mx-auto mb-4" />
          <h2 className="font-semibold text-lg">Importing your event types...</h2>
          <p className="text-gray-500 text-sm mt-1">This usually takes a few seconds.</p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && results && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="font-semibold text-lg">Import complete!</h2>
            <p className="text-gray-500 text-sm mt-1">
              {results.imported.length} event type{results.imported.length !== 1 ? "s" : ""} imported successfully
              {results.errors.length > 0 && `, ${results.errors.length} failed`}
            </p>
          </div>

          {results.imported.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Imported:</p>
              <div className="space-y-2">
                {results.imported.map((item) => (
                  <div key={item.slug} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">{item.name}</span>
                    <Link
                      href={`/dashboard/event-types`}
                      className="text-xs text-[#0066FF] hover:underline flex items-center gap-1"
                    >
                      Edit <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.errors.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-red-700 mb-2">Failed:</p>
              <div className="space-y-2">
                {results.errors.map((item, i) => (
                  <div key={i} className="p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-800">{item.name}: {item.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Link
              href="/dashboard/event-types"
              className="flex-1 py-2.5 bg-[#0066FF] text-white font-medium rounded-lg hover:bg-[#0052cc] text-center transition-colors"
            >
              View Event Types
            </Link>
            <button
              onClick={() => { setStep("api-key"); setApiKey(""); setResults(null); }}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Import More
            </button>
          </div>
        </div>
      )}

      {/* What gets imported */}
      {step === "api-key" && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">What gets imported:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>✅ Event type names, descriptions, durations</li>
            <li>✅ Colors and visibility settings</li>
            <li>✅ Location types (Google Meet, Zoom, phone, etc.)</li>
            <li>✅ Custom screening questions</li>
            <li>✅ Group event settings</li>
            <li className="text-gray-400">⏳ Availability schedules (coming soon)</li>
            <li className="text-gray-400">⏳ Past bookings (coming soon)</li>
          </ul>
        </div>
      )}
    </div>
  )
}
