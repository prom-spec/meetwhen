"use client"

import { useState, useEffect } from "react"
import { Plus, Users, Settings, ExternalLink, Copy, Check, Trash2, Loader2 } from "lucide-react"
import { handleFormError } from "@/lib/form-errors"
import Link from "next/link"
import { useToast } from "@/components/ToastProvider"
import ConfirmDialog from "@/components/ConfirmDialog"

interface TeamMember {
  id: string
  userId: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Team {
  id: string
  name: string
  slug: string
  ownerId: string
  createdAt: string
  owner: {
    id: string
    name: string | null
    email: string
    image: string | null
    username: string | null
  }
  members: TeamMember[]
  _count: {
    members: number
    eventTypes: number
  }
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: "", slug: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams")
      const data = await res.json()
      setTeams(data)
    } catch (error) {
      console.error("Error fetching teams:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        fetchTeams()
        setShowModal(false)
        setFormData({ name: "", slug: "" })
      } else {
        const error = await res.json()
        toast(handleFormError(error) || "Failed to create team", "error")
      }
    } catch (error) {
      console.error("Error creating team:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (teamId: string) => {
    setConfirmDeleteTeam(teamId)
  }

  const executeDeleteTeam = async () => {
    if (!confirmDeleteTeam) return
    try {
      const res = await fetch(`/api/teams/${confirmDeleteTeam}`, { method: "DELETE" })
      if (res.ok) {
        fetchTeams()
        toast("Team deleted", "success")
      } else {
        const error = await res.json()
        toast(handleFormError(error) || "Failed to delete team", "error")
      }
    } catch (error) {
      console.error("Error deleting team:", error)
    } finally {
      setConfirmDeleteTeam(null)
    }
  }

  const copyTeamLink = (team: Team) => {
    const ownerUsername = team.owner?.username || team.ownerId
    navigator.clipboard.writeText(`${window.location.origin}/team/${ownerUsername}/${team.slug}`)
    setCopiedSlug(team.slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  if (isLoading) {
    return (<div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>)
  }

  return (
    <div className="px-4 sm:px-0">
      <ConfirmDialog
        open={!!confirmDeleteTeam}
        title="Delete Team"
        message="Are you sure you want to delete this team? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={executeDeleteTeam}
        onCancel={() => setConfirmDeleteTeam(null)}
      />
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage team scheduling with round-robin or collective availability
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No teams yet</p>
          <p className="text-sm text-gray-400">Create a team to enable round-robin or collective scheduling.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-xs text-gray-500">/team/{team.owner?.username || "..."}/{team.slug}</p>
                  </div>
                </div>
              </div>

              {/* Member avatars */}
              <div className="flex items-center gap-1 mb-4">
                {team.members.slice(0, 4).map((member, index) => (
                  <div
                    key={member.id}
                    className="relative"
                    style={{ marginLeft: index > 0 ? "-8px" : "0", zIndex: 4 - index }}
                    title={member.user.name || member.user.email}
                  >
                    {member.user.image ? (
                      <img
                        src={member.user.image}
                        alt={member.user.name || "Member"}
                        className="w-8 h-8 rounded-full border-2 border-white"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                        {(member.user.name || member.user.email)[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
                {team._count.members > 4 && (
                  <div
                    className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                    style={{ marginLeft: "-8px" }}
                  >
                    +{team._count.members - 4}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{team._count.members} members</span>
                <span>{team._count.eventTypes} event types</span>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => copyTeamLink(team)}
                  className={`p-2 transition-colors ${copiedSlug === team.slug ? "text-green-500" : "text-gray-400 hover:text-gray-600"}`}
                  title="Copy team link"
                >
                  {copiedSlug === team.slug ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={`/team/${team.owner?.username || team.ownerId}/${team.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="View team page"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <Link
                  href={`/dashboard/teams/${team.id}`}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Team settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(team.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors ml-auto"
                  title="Delete team"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Team</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  placeholder="Sales Team"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">URL Slug</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm whitespace-nowrap">
                    /team/.../
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="block w-full rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder="sales-team"
                    pattern="[a-z0-9-]+"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Only lowercase letters, numbers, and hyphens
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ name: "", slug: "" })
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
                  {isSubmitting ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
