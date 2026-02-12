"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Edit, Trash2, Copy, ExternalLink, Video, MapPin, Phone, Link2, Check, ChevronRight, X, Loader2, CalendarPlus, Share2, Repeat } from "lucide-react"
import { useToast } from "@/components/ToastProvider"
import ConfirmDialog from "@/components/ConfirmDialog"
import ShareModal from "@/components/ShareModal"

type LocationType = "IN_PERSON" | "GOOGLE_MEET" | "ZOOM" | "PHONE" | "CUSTOM"

interface EventType {
  id: string
  title: string
  slug: string
  description: string | null
  duration: number
  color: string
  location: string | null
  locationType: LocationType
  locationValue: string | null
  isActive: boolean
  bufferBefore: number
  bufferAfter: number
  createdAt: string
}

const LOCATION_OPTIONS: { value: LocationType; label: string; icon: typeof Video; description?: string }[] = [
  { value: "GOOGLE_MEET", label: "Google Meet", icon: Video, description: "Video conference link generated automatically" },
  { value: "ZOOM", label: "Zoom", icon: Video, description: "Connect your Zoom account" },
  { value: "IN_PERSON", label: "In-person Meeting", icon: MapPin, description: "Enter a physical address" },
  { value: "PHONE", label: "Phone Call", icon: Phone, description: "You'll call the invitee" },
  { value: "CUSTOM", label: "Custom Link", icon: Link2, description: "Add your own meeting link" },
]

const COLOR_PRESETS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#334155", // slate
]

const DURATION_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
  { value: "120", label: "120 minutes" },
]

const BUFFER_OPTIONS = [
  { value: "0", label: "None" },
  { value: "5", label: "5 min" },
  { value: "10", label: "10 min" },
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
]

export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null)
  const [username, setUsername] = useState<string>("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [shareEventType, setShareEventType] = useState<EventType | null>(null)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    duration: "30",
    color: "#3B82F6",
    location: "",
    locationType: "GOOGLE_MEET" as LocationType,
    locationValue: "",
    bufferBefore: "0",
    bufferAfter: "0",
    maxBookingsPerDay: "",
    maxBookingsPerWeek: "",
    redirectUrl: "",
    visibility: "public",
    maxAttendees: "1",
    customQuestions: "[]",
    allowRecurring: false,
    recurrenceOptions: "[]",
    cancellationPolicy: "",
    confirmationLinks: "[]",
  })

  useEffect(() => {
    fetchEventTypes()
    fetchUsername()
  }, [])

  const fetchUsername = async () => {
    try {
      const res = await fetch("/api/user/profile")
      if (res.ok) {
        const data = await res.json()
        setUsername(data.username || "")
      }
    } catch (error) {
      console.error("Error fetching username:", error)
    }
  }

  const fetchEventTypes = async () => {
    try {
      const res = await fetch("/api/event-types")
      const data = await res.json()
      setEventTypes(data)
    } catch (error) {
      console.error("Error fetching event types:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingEventType 
        ? `/api/event-types/${editingEventType.id}`
        : "/api/event-types"
      
      const res = await fetch(url, {
        method: editingEventType ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        fetchEventTypes()
        closeModal()
      } else {
        const error = await res.json()
        toast(error.error || "Something went wrong", "error")
      }
    } catch (error) {
      console.error("Error saving event type:", error)
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmDelete(id)
  }

  const executeDelete = async () => {
    if (!confirmDelete) return
    try {
      const res = await fetch(`/api/event-types/${confirmDelete}`, { method: "DELETE" })
      if (res.ok) {
        fetchEventTypes()
        toast("Event type deleted", "success")
      }
    } catch (error) {
      console.error("Error deleting event type:", error)
    } finally {
      setConfirmDelete(null)
    }
  }

  const toggleActive = async (eventType: EventType) => {
    try {
      await fetch(`/api/event-types/${eventType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !eventType.isActive }),
      })
      fetchEventTypes()
    } catch (error) {
      console.error("Error toggling event type:", error)
    }
  }

  const openCreateModal = () => {
    setEditingEventType(null)
    setFormData({
      title: "",
      slug: "",
      description: "",
      duration: "30",
      color: "#3B82F6",
      location: "",
      locationType: "GOOGLE_MEET",
      locationValue: "",
      bufferBefore: "0",
      bufferAfter: "0",
      maxBookingsPerDay: "",
      maxBookingsPerWeek: "",
      redirectUrl: "",
      visibility: "public",
      maxAttendees: "1",
      customQuestions: "[]",
      allowRecurring: false,
      recurrenceOptions: "[]",
      cancellationPolicy: "",
      confirmationLinks: "[]",
    })
    setShowModal(true)
  }

  const openEditModal = (eventType: EventType) => {
    setEditingEventType(eventType)
    setFormData({
      title: eventType.title,
      slug: eventType.slug,
      description: eventType.description || "",
      duration: eventType.duration.toString(),
      color: eventType.color,
      location: eventType.location || "",
      locationType: eventType.locationType || "GOOGLE_MEET",
      locationValue: eventType.locationValue || "",
      bufferBefore: eventType.bufferBefore.toString(),
      bufferAfter: eventType.bufferAfter.toString(),
      maxBookingsPerDay: (eventType as any).maxBookingsPerDay?.toString() || "",
      maxBookingsPerWeek: (eventType as any).maxBookingsPerWeek?.toString() || "",
      redirectUrl: (eventType as any).redirectUrl || "",
      visibility: (eventType as any).visibility || "public",
      maxAttendees: ((eventType as any).maxAttendees || 1).toString(),
      customQuestions: (eventType as any).customQuestions || "[]",
      allowRecurring: (eventType as any).allowRecurring || false,
      recurrenceOptions: (eventType as any).recurrenceOptions || "[]",
      cancellationPolicy: (eventType as any).cancellationPolicy || "",
      confirmationLinks: (eventType as any).confirmationLinks || "[]",
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEventType(null)
  }

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  }

  const copyLink = (eventType: EventType) => {
    const bookingUrl = `${window.location.origin}/${username}/${eventType.slug}`
    navigator.clipboard.writeText(bookingUrl)
    setCopiedId(eventType.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getBaseUrl = () => {
    if (typeof window === "undefined") return "letsmeet.com"
    return window.location.host
  }

  const getFullUrl = () => {
    const base = getBaseUrl()
    const slug = formData.slug || "event"
    return `${base}/${username || "you"}/${slug}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Types</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create events that people can book on your calendar
          </p>
        </div>
        <Link
          href="/dashboard/event-types/new"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Event Type
        </Link>
      </div>

      {eventTypes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <CalendarPlus className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No event types yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first event type so people can book time with you.</p>
          <Link
            href="/dashboard/event-types/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Event Type
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {eventTypes.map((eventType) => (
            <div
              key={eventType.id}
              className={`bg-white rounded-lg border-l-4 shadow-sm p-4 ${
                eventType.isActive ? "" : "opacity-60"
              }`}
              style={{ borderLeftColor: eventType.color }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{eventType.title}</h3>
                  <p className="text-sm text-gray-500">{eventType.duration} min</p>
                  {eventType.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {eventType.description}
                    </p>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventType.isActive}
                    onChange={() => toggleActive(eventType)}
                    className="sr-only peer"
                    aria-label={`Toggle ${eventType.title} ${eventType.isActive ? "off" : "on"}`}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {/* Primary CTA: Share Link */}
                <button
                  onClick={() => copyLink(eventType)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    copiedId === eventType.id
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {copiedId === eventType.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Share Booking Link
                    </>
                  )}
                </button>
                {/* Secondary actions */}
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setShareEventType(eventType)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                  <a
                    href={`/${username}/${eventType.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    title="Preview"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview
                  </a>
                  <button
                    onClick={() => openEditModal(eventType)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(eventType.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        open={!!shareEventType}
        onClose={() => setShareEventType(null)}
        bookingUrl={shareEventType ? `${typeof window !== "undefined" ? window.location.origin : "https://letsmeet.link"}/${username}/${shareEventType.slug}` : ""}
        eventTitle={shareEventType?.title || ""}
      />

      {/* Modal - Responsive: Full screen on mobile, centered card on desktop */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Event Type"
        message="Are you sure you want to delete this event type? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-xl sm:mx-4 max-h-[90vh] overflow-hidden flex flex-col rounded-t-xl sm:rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <button
                type="button"
                onClick={closeModal}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:hidden"
              >
                Cancel
              </button>
              <h2 className="text-lg font-semibold text-gray-900 text-center flex-1 sm:flex-none sm:text-left">
                {editingEventType ? "Edit Event Type" : "New Event Type"}
              </h2>
              <button
                type="submit"
                form="event-type-form"
                className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg text-sm font-medium sm:hidden"
              >
                Save
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="hidden sm:block p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <form id="event-type-form" onSubmit={handleSubmit} className="p-4 sm:p-6">
                {/* Desktop: 2-column layout, Mobile: single column */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-5">
                    {/* Event Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Event Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            title: e.target.value,
                            slug: editingEventType ? formData.slug : generateSlug(e.target.value),
                          })
                        }}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g. 15 Minute Meeting"
                      />
                    </div>

                    {/* URL Slug */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        URL Slug
                      </label>
                      <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                        <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
                          {getBaseUrl()}/{username || "you"}/
                        </span>
                        <input
                          type="text"
                          required
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          className="flex-1 px-3 py-2.5 text-gray-900 placeholder-gray-400 sm:text-sm focus:outline-none"
                          placeholder="quick-chat"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500">
                        Your link: {getFullUrl()}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm resize-none"
                        placeholder="Briefly describe what this meeting is about..."
                      />
                    </div>

                    {/* Event Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Color
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                              formData.color === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                          >
                            {formData.color === color && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-5">
                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <div className="space-y-2">
                        {LOCATION_OPTIONS.map((option) => {
                          const Icon = option.icon
                          const isSelected = formData.locationType === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, locationType: option.value, locationValue: "" })}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${isSelected ? "bg-blue-100" : "bg-gray-100"}`}>
                                <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-gray-500"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                                  {option.label}
                                </p>
                                {option.description && (
                                  <p className={`text-xs ${isSelected ? "text-blue-600" : "text-gray-500"} truncate`}>
                                    {option.description}
                                  </p>
                                )}
                              </div>
                              {isSelected ? (
                                <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      {formData.locationType !== "GOOGLE_MEET" && (
                        <input
                          type="text"
                          value={formData.locationValue}
                          onChange={(e) => setFormData({ ...formData, locationValue: e.target.value })}
                          className="mt-3 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                          placeholder={
                            formData.locationType === "ZOOM" ? "https://zoom.us/j/..." :
                            formData.locationType === "IN_PERSON" ? "123 Main St, City" :
                            formData.locationType === "PHONE" ? "+1 (555) 123-4567" :
                            "https://..."
                          }
                        />
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Duration
                      </label>
                      <select
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm bg-white"
                      >
                        {DURATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Buffer Times */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Buffer Before
                        </label>
                        <select
                          value={formData.bufferBefore}
                          onChange={(e) => setFormData({ ...formData, bufferBefore: e.target.value })}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm bg-white"
                        >
                          {BUFFER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Buffer After
                        </label>
                        <select
                          value={formData.bufferAfter}
                          onChange={(e) => setFormData({ ...formData, bufferAfter: e.target.value })}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm bg-white"
                        >
                          {BUFFER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recurring Meetings */}
                <div className="space-y-4 mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
                    <Repeat className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Recurring Meetings
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Allow recurring bookings</label>
                      <p className="text-xs text-gray-500">Guests can book a series of meetings at once</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowRecurring}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setFormData({ 
                            ...formData, 
                            allowRecurring: checked,
                            recurrenceOptions: checked && formData.recurrenceOptions === "[]" 
                              ? JSON.stringify(["weekly_4", "weekly_8", "biweekly_4", "monthly_3"])
                              : formData.recurrenceOptions,
                          })
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {formData.allowRecurring && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Allowed frequencies</label>
                      <div className="space-y-2">
                        {[
                          { value: "weekly_4", label: "Weekly × 4 (1 month)" },
                          { value: "weekly_8", label: "Weekly × 8 (2 months)" },
                          { value: "biweekly_4", label: "Biweekly × 4 (2 months)" },
                          { value: "monthly_3", label: "Monthly × 3 (3 months)" },
                        ].map((opt) => {
                          const selected: string[] = (() => { try { return JSON.parse(formData.recurrenceOptions) } catch { return [] } })()
                          const isChecked = selected.includes(opt.value)
                          return (
                            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const next = isChecked 
                                    ? selected.filter((v: string) => v !== opt.value) 
                                    : [...selected, opt.value]
                                  setFormData({ ...formData, recurrenceOptions: JSON.stringify(next) })
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{opt.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cancellation Policy & Confirmation Links */}
                <div className="space-y-4 mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Booking Experience</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Cancellation Policy</label>
                    <textarea
                      value={formData.cancellationPolicy}
                      onChange={(e) => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                      rows={2}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm resize-none"
                      placeholder="e.g. Please cancel at least 24 hours in advance..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Shown to guests on your booking page</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmation Page Links</label>
                    <p className="text-xs text-gray-500 mb-2">Add links shown after booking (JSON array of {`{label, url}`})</p>
                    <textarea
                      value={formData.confirmationLinks}
                      onChange={(e) => setFormData({ ...formData, confirmationLinks: e.target.value })}
                      rows={3}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm font-mono text-xs resize-none"
                      placeholder='[{"label": "Preparation Guide", "url": "https://..."}]'
                    />
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Advanced Settings</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Bookings / Day</label>
                      <input type="number" min="1" placeholder="Unlimited"
                        value={formData.maxBookingsPerDay}
                        onChange={(e) => setFormData({ ...formData, maxBookingsPerDay: e.target.value })}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Bookings / Week</label>
                      <input type="number" min="1" placeholder="Unlimited"
                        value={formData.maxBookingsPerWeek}
                        onChange={(e) => setFormData({ ...formData, maxBookingsPerWeek: e.target.value })}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Attendees per Slot</label>
                    <input type="number" min="1" placeholder="1 (one-on-one)"
                      value={formData.maxAttendees}
                      onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Set to more than 1 for group events</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Visibility</label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm bg-white"
                    >
                      <option value="public">Public — shown on your profile</option>
                      <option value="unlisted">Unlisted — only accessible via direct link</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Redirect After Booking</label>
                    <input type="url" placeholder="https://example.com/thank-you"
                      value={formData.redirectUrl}
                      onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Guest will be redirected here after booking instead of the default confirmation page</p>
                  </div>
                </div>

                {/* Desktop Footer */}
                <div className="hidden sm:flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    {editingEventType ? "Save Changes" : "Create Event Type"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
