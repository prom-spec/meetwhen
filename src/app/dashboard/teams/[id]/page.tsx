"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Plus, Users, Trash2, Crown, Shield, User, RefreshCw, ExternalLink, Copy, Check, Edit, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ToastProvider"
import ConfirmDialog from "@/components/ConfirmDialog"

interface TeamMember {
  id: string
  userId: string
  role: "OWNER" | "ADMIN" | "MEMBER"
  priority: number
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    timezone: string
  }
}

interface EventType {
  id: string
  title: string
  slug: string
  description: string | null
  duration: number
  color: string
  isActive: boolean
  schedulingType: "INDIVIDUAL" | "ROUND_ROBIN" | "COLLECTIVE"
}

interface Team {
  id: string
  name: string
  slug: string
  ownerId: string
  members: TeamMember[]
  eventTypes: EventType[]
}

export default function TeamSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string

  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showEventTypeModal, setShowEventTypeModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<"ADMIN" | "MEMBER">("MEMBER")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<string | null>(null)
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<string | null>(null)
  const { toast } = useToast()
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null)
  const [eventTypeForm, setEventTypeForm] = useState({
    title: "",
    slug: "",
    description: "",
    duration: "30",
    color: "#3B82F6",
    schedulingType: "ROUND_ROBIN" as "ROUND_ROBIN" | "COLLECTIVE",
  })

  useEffect(() => {
    fetchTeam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  const fetchTeam = async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}`)
      if (res.ok) {
        const data = await res.json()
        setTeam(data)
      } else {
        router.push("/dashboard/teams")
      }
    } catch (error) {
      console.error("Error fetching team:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newMemberEmail, role: newMemberRole }),
      })

      if (res.ok) {
        fetchTeam()
        setShowAddMemberModal(false)
        setNewMemberEmail("")
        setNewMemberRole("MEMBER")
      } else {
        const error = await res.json()
        toast(error.error || "Failed to add member", "error")
      }
    } catch (error) {
      console.error("Error adding member:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setConfirmRemoveMember(userId)
  }

  const executeRemoveMember = async () => {
    if (!confirmRemoveMember) return
    try {
      const res = await fetch(`/api/teams/${teamId}/members?userId=${confirmRemoveMember}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchTeam()
      } else {
        const error = await res.json()
        toast(error.error || "Failed to remove member", "error")
      }
    } catch (error) {
      console.error("Error removing member:", error)
    } finally {
      setConfirmRemoveMember(null)
    }
  }

  const handleUpdateMemberRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      })

      if (res.ok) {
        fetchTeam()
      } else {
        const error = await res.json()
        toast(error.error || "Failed to update role", "error")
      }
    } catch (error) {
      console.error("Error updating role:", error)
    }
  }

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  }

  const handleCreateEventType = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/event-types", {
        method: editingEventType ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventTypeForm,
          teamId,
          ...(editingEventType && { id: editingEventType.id }),
        }),
      })

      if (res.ok) {
        fetchTeam()
        setShowEventTypeModal(false)
        setEditingEventType(null)
        setEventTypeForm({
          title: "",
          slug: "",
          description: "",
          duration: "30",
          color: "#3B82F6",
          schedulingType: "ROUND_ROBIN",
        })
      } else {
        const error = await res.json()
        toast(error.error || "Failed to create event type", "error")
      }
    } catch (error) {
      console.error("Error creating event type:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEventType = async (eventTypeId: string) => {
    setConfirmDeleteEvent(eventTypeId)
  }

  const executeDeleteEventType = async () => {
    if (!confirmDeleteEvent) return
    try {
      const res = await fetch(`/api/event-types/${confirmDeleteEvent}`, { method: "DELETE" })
      if (res.ok) {
        fetchTeam()
        toast("Event type deleted", "success")
      }
    } catch (error) {
      console.error("Error deleting event type:", error)
    } finally {
      setConfirmDeleteEvent(null)
    }
  }

  const openEditEventType = (eventType: EventType) => {
    setEditingEventType(eventType)
    setEventTypeForm({
      title: eventType.title,
      slug: eventType.slug,
      description: eventType.description || "",
      duration: eventType.duration.toString(),
      color: eventType.color,
      schedulingType: eventType.schedulingType === "COLLECTIVE" ? "COLLECTIVE" : "ROUND_ROBIN",
    })
    setShowEventTypeModal(true)
  }

  const copyEventLink = (slug: string) => {
    if (team) {
      navigator.clipboard.writeText(`${window.location.origin}/team/${team.slug}/${slug}`)
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug(null), 2000)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Crown className="w-4 h-4 text-yellow-500" />
      case "ADMIN":
        return <Shield className="w-4 h-4 text-blue-500" />
      default:
        return <User className="w-4 h-4 text-gray-400" />
    }
  }

  if (isLoading) {
    return (<div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>)
  }

  if (!team) {
    return <div className="text-center py-10">Team not found</div>
  }

  return (
    <div className="px-4 sm:px-0">
      <ConfirmDialog
        open={!!confirmRemoveMember}
        title="Remove Member"
        message="Remove this member from the team?"
        confirmLabel="Remove"
        onConfirm={executeRemoveMember}
        onCancel={() => setConfirmRemoveMember(null)}
      />
      <ConfirmDialog
        open={!!confirmDeleteEvent}
        title="Delete Event Type"
        message="Are you sure you want to delete this event type?"
        confirmLabel="Delete"
        onConfirm={executeDeleteEventType}
        onCancel={() => setConfirmDeleteEvent(null)}
      />
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/teams"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Teams
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            <p className="text-sm text-gray-500">/team/{team.slug}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Members Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Member
            </button>
          </div>

          <div className="space-y-3">
            {team.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {member.user.image ? (
                    <img
                      src={member.user.image}
                      alt={member.user.name || "Member"}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.user.name || member.user.email}
                    </p>
                    <p className="text-xs text-gray-500">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {member.role === "OWNER" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded">
                      {getRoleIcon(member.role)}
                      Owner
                    </span>
                  ) : (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateMemberRole(member.userId, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  )}
                  {member.role !== "OWNER" && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Event Types Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Team Event Types</h2>
            <button
              onClick={() => {
                setEditingEventType(null)
                setEventTypeForm({
                  title: "",
                  slug: "",
                  description: "",
                  duration: "30",
                  color: "#3B82F6",
                  schedulingType: "ROUND_ROBIN",
                })
                setShowEventTypeModal(true)
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Event Type
            </button>
          </div>

          {team.eventTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No team event types yet</p>
              <p className="text-xs mt-1">Create one to enable team scheduling</p>
            </div>
          ) : (
            <div className="space-y-3">
              {team.eventTypes.map((eventType) => (
                <div
                  key={eventType.id}
                  className="p-3 border-l-4 bg-gray-50 rounded-lg"
                  style={{ borderLeftColor: eventType.color }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{eventType.title}</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          {eventType.schedulingType === "COLLECTIVE" ? (
                            <>
                              <Users className="w-3 h-3" />
                              Collective
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              Round Robin
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{eventType.duration} min</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyEventLink(eventType.slug)}
                        className={`p-1.5 ${copiedSlug === eventType.slug ? "text-green-500" : "text-gray-400 hover:text-gray-600"}`}
                        title="Copy link"
                      >
                        {copiedSlug === eventType.slug ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={`/team/${team.slug}/${eventType.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                        title="Preview"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => openEditEventType(eventType)}
                        className="p-1.5 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEventType(eventType.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Add Team Member</h2>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder="member@example.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The user must have an account on letsmeet.link
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as "ADMIN" | "MEMBER")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setNewMemberEmail("")
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Type Modal */}
      {showEventTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingEventType ? "Edit Event Type" : "Create Team Event Type"}
            </h2>
            <form onSubmit={handleCreateEventType} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={eventTypeForm.title}
                  onChange={(e) =>
                    setEventTypeForm({
                      ...eventTypeForm,
                      title: e.target.value,
                      slug: editingEventType ? eventTypeForm.slug : generateSlug(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder="Team Consultation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">URL Slug</label>
                <input
                  type="text"
                  required
                  value={eventTypeForm.slug}
                  onChange={(e) => setEventTypeForm({ ...eventTypeForm, slug: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder="team-consultation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Scheduling Type</label>
                <select
                  value={eventTypeForm.schedulingType}
                  onChange={(e) =>
                    setEventTypeForm({
                      ...eventTypeForm,
                      schedulingType: e.target.value as "ROUND_ROBIN" | "COLLECTIVE",
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                >
                  <option value="ROUND_ROBIN">Round Robin - Distribute among available members</option>
                  <option value="COLLECTIVE">Collective - All members must be available</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {eventTypeForm.schedulingType === "ROUND_ROBIN"
                    ? "Bookings are distributed fairly among team members"
                    : "Find times when everyone is available"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <select
                  value={eventTypeForm.duration}
                  onChange={(e) => setEventTypeForm({ ...eventTypeForm, duration: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={eventTypeForm.description}
                  onChange={(e) =>
                    setEventTypeForm({ ...eventTypeForm, description: e.target.value })
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder="Meet with our team..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <input
                  type="color"
                  value={eventTypeForm.color}
                  onChange={(e) => setEventTypeForm({ ...eventTypeForm, color: e.target.value })}
                  className="mt-1 h-10 w-full rounded-md border-gray-300"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEventTypeModal(false)
                    setEditingEventType(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingEventType ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
