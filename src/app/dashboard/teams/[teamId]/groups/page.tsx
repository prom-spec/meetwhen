"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Plus, Users, Trash2, Settings } from "lucide-react"

interface Group {
  id: string
  name: string
  description: string | null
  _count: { members: number; eventTypes: number }
}

export default function TeamGroupsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const fetchGroups = useCallback(async () => {
    const res = await fetch(`/api/teams/${teamId}/groups`)
    if (res.ok) {
      const data = await res.json()
      setGroups(data.groups)
    }
    setLoading(false)
  }, [teamId])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const createGroup = async () => {
    if (!name.trim()) return
    const res = await fetch(`/api/teams/${teamId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    })
    if (res.ok) {
      setShowCreate(false)
      setName("")
      setDescription("")
      fetchGroups()
    }
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm("Delete this group?")) return
    await fetch(`/api/teams/${teamId}/groups/${groupId}`, { method: "DELETE" })
    fetchGroups()
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Groups</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Create Group
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-2" />
          <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-3" />
          <div className="flex gap-2">
            <button onClick={createGroup} className="px-4 py-2 bg-[#0066FF] text-white rounded-lg text-sm">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No groups yet</p>
          <p className="text-sm text-gray-400 mt-1">Create groups to organize team members and scope event types</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{g.name}</h3>
                {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                <p className="text-xs text-gray-400 mt-1">{g._count.members} members · {g._count.eventTypes} event types</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteGroup(g.id)} className="p-2 text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
