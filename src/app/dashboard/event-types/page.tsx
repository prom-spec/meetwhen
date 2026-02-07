"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Copy, ExternalLink, Video, MapPin, Phone, Link2 } from "lucide-react"

// Note: metadata must be in a separate layout.tsx for client components
// Title is set in the dashboard layout

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

const LOCATION_OPTIONS: { value: LocationType; label: string; icon: typeof Video; placeholder: string }[] = [
  { value: "GOOGLE_MEET", label: "Google Meet", icon: Video, placeholder: "Link generated automatically" },
  { value: "ZOOM", label: "Zoom", icon: Video, placeholder: "https://zoom.us/j/..." },
  { value: "IN_PERSON", label: "In Person", icon: MapPin, placeholder: "123 Main St, City, Country" },
  { value: "PHONE", label: "Phone Call", icon: Phone, placeholder: "+1 (555) 123-4567" },
  { value: "CUSTOM", label: "Custom Link", icon: Link2, placeholder: "https://..." },
]

export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null)
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
  })

  useEffect(() => {
    fetchEventTypes()
  }, [])

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
        alert(error.error || "Something went wrong")
      }
    } catch (error) {
      console.error("Error saving event type:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event type?")) return

    try {
      const res = await fetch(`/api/event-types/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchEventTypes()
      }
    } catch (error) {
      console.error("Error deleting event type:", error)
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

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`)
    alert("Link copied!")
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>
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
        <button
          onClick={openCreateModal}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Event Type
        </button>
      </div>

      {eventTypes.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No event types yet. Create your first one!</p>
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
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => copyLink(eventType.slug)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={`/${eventType.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Preview"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => openEditModal(eventType)}
                  className="p-2 text-gray-400 hover:text-blue-600"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(eventType.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingEventType ? "Edit Event Type" : "New Event Type"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder="30 Minute Meeting"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">URL Slug</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder="30-minute-meeting"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder="A quick chat to discuss..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="mt-1 h-10 w-full rounded-md border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {LOCATION_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isSelected = formData.locationType === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, locationType: option.value, locationValue: "" })}
                        className={`flex flex-col items-center justify-center p-2 rounded-md border text-xs transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-600"
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span className="text-center leading-tight">{option.label}</span>
                      </button>
                    )
                  })}
                </div>
                {formData.locationType !== "GOOGLE_MEET" && (
                  <input
                    type="text"
                    value={formData.locationValue}
                    onChange={(e) => setFormData({ ...formData, locationValue: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder={LOCATION_OPTIONS.find(o => o.value === formData.locationType)?.placeholder}
                  />
                )}
                {formData.locationType === "GOOGLE_MEET" && (
                  <p className="text-sm text-gray-500 italic">
                    A Google Meet link will be generated automatically when someone books
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Buffer before</label>
                  <select
                    value={formData.bufferBefore}
                    onChange={(e) => setFormData({ ...formData, bufferBefore: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  >
                    <option value="0">No buffer</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Buffer after</label>
                  <select
                    value={formData.bufferAfter}
                    onChange={(e) => setFormData({ ...formData, bufferAfter: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  >
                    <option value="0">No buffer</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  {editingEventType ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
