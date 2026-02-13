"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Search, Plus, User, Building2, Mail, Phone, ChevronRight, X } from "lucide-react"
import PlanGate from "@/components/PlanGate"

interface Contact {
  id: string
  email: string
  name: string | null
  phone: string | null
  company: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  _count: { bookings: number }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: "", name: "", phone: "", company: "", notes: "" })
  const [selected, setSelected] = useState<(Contact & { bookings?: any[] }) | null>(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/contacts?search=${encodeURIComponent(search)}`)
    if (res.ok) {
      const data = await res.json()
      setContacts(data.contacts)
      setTotal(data.total)
    }
    setLoading(false)
  }, [search])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const loadContact = async (id: string) => {
    const res = await fetch(`/api/contacts/${id}`)
    if (res.ok) setSelected(await res.json())
  }

  const addContact = async () => {
    if (!form.email) return
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ email: "", name: "", phone: "", company: "", notes: "" })
      fetchContacts()
    }
  }

  return (
    <PlanGate feature="contacts" featureLabel="Contacts Management" description="Manage your contacts and see their booking history in one place.">
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">{total} contacts</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Add Contact</h2>
            <div className="space-y-3">
              <input placeholder="Email *" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Company" value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" rows={3} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={addContact} className="px-4 py-2 bg-[#0066FF] text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{selected.name || selected.email}</h2>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {selected.email}</div>
              {selected.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {selected.phone}</div>}
              {selected.company && <div className="flex items-center gap-2"><Building2 className="w-4 h-4" /> {selected.company}</div>}
              {selected.notes && <p className="text-gray-500 italic">{selected.notes}</p>}
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Booking History</h3>
            {selected.bookings?.length ? (
              <div className="space-y-2">
                {selected.bookings.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{b.eventType?.title || "Meeting"}</p>
                      <p className="text-gray-500">{new Date(b.startTime).toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${b.status === "CONFIRMED" ? "bg-green-100 text-green-700" : b.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No bookings yet</p>
            )}
            <div className="mt-4">
              <Link href={`/api/contacts/${selected.id}/share`} className="text-sm text-blue-600 hover:underline">
                Share availability →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Contact List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No contacts yet</p>
          <p className="text-sm text-gray-400 mt-1">Contacts are auto-created when someone books with you</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {contacts.map((c) => (
            <button key={c.id} onClick={() => loadContact(c.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                  {(c.name || c.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{c.name || c.email}</p>
                  <p className="text-sm text-gray-500">{c.name ? c.email : ""}{c.company ? ` · ${c.company}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{c._count.bookings} bookings</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
    </PlanGate>
  )
}
