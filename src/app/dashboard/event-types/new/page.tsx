"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Video, MapPin, Phone, Link2, Check, Save } from "lucide-react"
import { useToast } from "@/components/ToastProvider"
import ShareModal from "@/components/ShareModal"

type LocationType = "IN_PERSON" | "GOOGLE_MEET" | "ZOOM" | "PHONE" | "CUSTOM"

const LOCATION_OPTIONS: { value: LocationType; label: string; icon: typeof Video; description: string }[] = [
  { value: "GOOGLE_MEET", label: "Google Meet", icon: Video, description: "Auto-generated video link" },
  { value: "ZOOM", label: "Zoom", icon: Video, description: "Add your Zoom link" },
  { value: "IN_PERSON", label: "In Person", icon: MapPin, description: "Physical location" },
  { value: "PHONE", label: "Phone", icon: Phone, description: "You'll call them" },
  { value: "CUSTOM", label: "Custom", icon: Link2, description: "Any meeting link" },
]

const COLOR_PRESETS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6", "#334155",
]

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
]

export default function NewEventTypePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [username, setUsername] = useState("")
  const [saving, setSaving] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [createdEventSlug, setCreatedEventSlug] = useState("")
  const [createdEventTitle, setCreatedEventTitle] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    duration: 30,
    color: "#3B82F6",
    locationType: "GOOGLE_MEET" as LocationType,
    locationValue: "",
    bufferBefore: 0,
    bufferAfter: 0,
  })

  useEffect(() => {
    fetch("/api/user/profile")
      .then(res => res.json())
      .then(data => setUsername(data.username || ""))
      .catch(() => {})
  }, [])

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const res = await fetch("/api/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setCreatedEventSlug(formData.slug)
        setCreatedEventTitle(formData.title)
        setShowShareModal(true)
      } else {
        const error = await res.json()
        toast(error.error || "Something went wrong", "error")
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setSaving(false)
    }
  }

  const baseUrl = typeof window !== "undefined" ? window.location.host : "letsmeet.link"
  const bookingBaseUrl = typeof window !== "undefined" ? window.location.origin : "https://letsmeet.link"

  return (
    <>
    <ShareModal
      open={showShareModal}
      onClose={() => {
        setShowShareModal(false)
        router.push("/dashboard/event-types")
      }}
      bookingUrl={`${bookingBaseUrl}/${username}/${createdEventSlug}`}
      eventTitle={createdEventTitle}
    />
    <div className="min-h-screen bg-gray-50">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/event-types"
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="text-sm text-gray-500">Event Types</div>
                <h1 className="text-lg font-semibold text-gray-900">New Event Type</h1>
              </div>
            </div>
            <button
              type="submit"
              form="event-type-form"
              disabled={saving || !formData.title || !formData.slug}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Event Type"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form id="event-type-form" onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Event Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">
                Event Details
              </h2>

              <div className="space-y-6">
                {/* Event Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({
                      ...formData,
                      title: e.target.value,
                      slug: generateSlug(e.target.value),
                    })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    placeholder="e.g. Quick Chat, Strategy Session"
                  />
                </div>

                {/* URL Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {baseUrl}/{username || "you"}/
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="quick-chat"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 resize-none"
                    placeholder="Describe what this meeting is about..."
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Event Color
                  </label>
                  <div className="flex gap-3">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          formData.color === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {formData.color === color && <Check className="w-5 h-5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">
                Configuration
              </h2>

              <div className="space-y-6">
                {/* Duration Pills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Duration
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, duration: opt.value })}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          formData.duration === opt.value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location Cards */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Location
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {LOCATION_OPTIONS.map((opt) => {
                      const Icon = opt.icon
                      const selected = formData.locationType === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, locationType: opt.value, locationValue: "" })}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            selected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Icon className={`w-5 h-5 mb-2 ${selected ? "text-blue-600" : "text-gray-400"}`} />
                          <div className={`text-sm font-medium ${selected ? "text-blue-900" : "text-gray-900"}`}>
                            {opt.label}
                          </div>
                          <div className={`text-xs mt-0.5 ${selected ? "text-blue-600" : "text-gray-500"}`}>
                            {opt.description}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {formData.locationType !== "GOOGLE_MEET" && (
                    <input
                      type="text"
                      value={formData.locationValue}
                      onChange={(e) => setFormData({ ...formData, locationValue: e.target.value })}
                      className="mt-3 w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={
                        formData.locationType === "ZOOM" ? "https://zoom.us/j/..." :
                        formData.locationType === "IN_PERSON" ? "123 Main St, City" :
                        formData.locationType === "PHONE" ? "+1 (555) 123-4567" : "https://..."
                      }
                    />
                  )}
                </div>

                {/* Buffer Times */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Buffer Time
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">Before event</label>
                      <select
                        value={formData.bufferBefore}
                        onChange={(e) => setFormData({ ...formData, bufferBefore: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value={0}>None</option>
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">After event</label>
                      <select
                        value={formData.bufferAfter}
                        onChange={(e) => setFormData({ ...formData, bufferAfter: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value={0}>None</option>
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}
