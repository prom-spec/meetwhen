"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Code, Monitor, MessageSquare, Loader2 } from "lucide-react"
import { useToast } from "@/components/ToastProvider"

interface EventType {
  id: string
  title: string
  slug: string
  duration: number
}

type EmbedMode = "inline" | "popup" | "floating"

export default function EmbedPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null)
  const [username, setUsername] = useState("")
  const [activeMode, setActiveMode] = useState<EmbedMode>("inline")
  const [floatingText, setFloatingText] = useState("Book a meeting")
  const [floatingColor, setFloatingColor] = useState("#0066FF")
  const [copiedMode, setCopiedMode] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([
      fetch("/api/event-types").then(r => r.json()),
      fetch("/api/user/profile").then(r => r.json()),
    ]).then(([events, profile]) => {
      setEventTypes(events)
      setUsername(profile.username || "")
      if (events.length > 0) setSelectedEvent(events[0])
    }).catch(() => toast("Failed to load data", "error"))
      .finally(() => setIsLoading(false))
  }, [toast])

  const bookingUrl = selectedEvent
    ? `https://letsmeet.link/${username}/${selectedEvent.slug}`
    : ""

  function getCode(mode: EmbedMode): string {
    if (!bookingUrl) return ""
    const script = '<script src="https://letsmeet.link/embed.js" async><\/script>'
    switch (mode) {
      case "inline":
        return `<div data-letsmeet-url="${bookingUrl}" data-letsmeet-mode="inline"></div>\n${script}`
      case "popup":
        return `<button data-letsmeet-url="${bookingUrl}" data-letsmeet-mode="popup">Book a meeting</button>\n${script}`
      case "floating":
        return `<div data-letsmeet-url="${bookingUrl}" data-letsmeet-mode="floating" data-letsmeet-text="${floatingText}" data-letsmeet-color="${floatingColor}"></div>\n${script}`
    }
  }

  function copyCode(mode: EmbedMode) {
    navigator.clipboard.writeText(getCode(mode))
    setCopiedMode(mode)
    toast("Copied to clipboard!", "success")
    setTimeout(() => setCopiedMode(null), 2000)
  }

  const modes: { key: EmbedMode; label: string; desc: string; icon: typeof Code }[] = [
    { key: "inline", label: "Inline", desc: "Embed directly in your page", icon: Monitor },
    { key: "popup", label: "Popup", desc: "Button that opens a modal", icon: Code },
    { key: "floating", label: "Floating", desc: "Floating button with slide-in panel", icon: MessageSquare },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  if (eventTypes.length === 0) {
    return (
      <div className="text-center py-20">
        <Code className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Event Types</h2>
        <p className="text-gray-500">Create an event type first to generate embed codes.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Embed Widget</h1>
        <p className="text-gray-500 mt-1">Add your booking page to any website</p>
      </div>

      {/* Event selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
        <select
          value={selectedEvent?.id || ""}
          onChange={(e) => setSelectedEvent(eventTypes.find(et => et.id === e.target.value) || null)}
          className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
        >
          {eventTypes.map(et => (
            <option key={et.id} value={et.id}>{et.title} ({et.duration}min)</option>
          ))}
        </select>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => setActiveMode(m.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeMode === m.key
                ? "bg-[#0066FF] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <m.icon className="w-4 h-4" />
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Code + options */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-1">
            {modes.find(m => m.key === activeMode)?.label} Embed
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {modes.find(m => m.key === activeMode)?.desc}
          </p>

          {activeMode === "floating" && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Button Text</label>
                <input
                  type="text"
                  value={floatingText}
                  onChange={e => setFloatingText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Button Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={floatingColor}
                    onChange={e => setFloatingColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={floatingColor}
                    onChange={e => setFloatingColor(e.target.value)}
                    className="w-24 px-2 py-1 text-sm border border-gray-200 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <pre className="bg-gray-900 text-green-400 text-sm p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {getCode(activeMode)}
            </pre>
            <button
              onClick={() => copyCode(activeMode)}
              className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              {copiedMode === activeMode ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
          <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[300px] relative overflow-hidden">
            {activeMode === "inline" && bookingUrl && (
              <iframe
                src={`${bookingUrl}?embed=true`}
                className="w-full h-[500px] border-none rounded"
              />
            )}
            {activeMode === "popup" && (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <button
                  onClick={() => {
                    // Open preview in a new window since we can't iframe localhost easily
                    window.open(`${bookingUrl}?embed=true`, '_blank', 'width=700,height=700')
                  }}
                  className="px-6 py-3 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052cc] transition-colors"
                >
                  Book a meeting
                </button>
                <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-400">
                  Click to preview the popup experience
                </p>
              </div>
            )}
            {activeMode === "floating" && (
              <div className="relative h-[300px]">
                <p className="text-sm text-gray-400 p-4">Your website content here...</p>
                <button
                  className="absolute bottom-4 right-4 text-white px-5 py-3 rounded-full font-semibold text-sm shadow-lg"
                  style={{ backgroundColor: floatingColor }}
                  onClick={() => window.open(`${bookingUrl}?embed=true`, '_blank', 'width=420,height=700')}
                >
                  {floatingText}
                </button>
                <p className="absolute bottom-4 left-4 text-xs text-gray-400">
                  Click to preview
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
