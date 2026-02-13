"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Globe, Check, RefreshCw, Shield, Palette, Users, ChevronLeft,
  Copy, Trash2, Building2, AlertTriangle
} from "lucide-react"
import PlanGate from "@/components/PlanGate"

interface DomainClaim {
  id: string
  domain: string
  verificationToken: string
  verifiedAt: string | null
  createdAt: string
  orgSettings: OrgSettings | null
}

interface OrgSettings {
  id: string
  enforceSSO: boolean
  enforceBranding: boolean
  brandColors: { primary?: string; accent?: string } | null
  brandLogo: string | null
  brandFooter: string | null
}

interface DomainAccount {
  id: string
  name: string | null
  email: string
  image: string | null
  username: string | null
  eventTypesCount: number
  bookingsCount: number
  lastActive: string
  createdAt: string
}

export default function DomainSettingsPage() {
  const [claims, setClaims] = useState<DomainClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [newDomain, setNewDomain] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [selectedClaim, setSelectedClaim] = useState<DomainClaim | null>(null)
  const [accounts, setAccounts] = useState<DomainAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; message: string } | null>(null)
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchClaims = useCallback(async () => {
    try {
      const res = await fetch("/api/domain-claims")
      if (res.ok) setClaims(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClaims() }, [fetchClaims])

  const addDomain = async () => {
    setError("")
    setAdding(true)
    try {
      const res = await fetch("/api/domain-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to add domain")
        return
      }
      setNewDomain("")
      fetchClaims()
    } finally {
      setAdding(false)
    }
  }

  const deleteClaim = async (id: string) => {
    if (!confirm("Remove this domain claim?")) return
    await fetch("/api/domain-claims", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (selectedClaim?.id === id) setSelectedClaim(null)
    fetchClaims()
  }

  const verifyDomain = async (claim: DomainClaim) => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await fetch("/api/domain-claims/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: claim.id }),
      })
      const data = await res.json()
      setVerifyResult(data)
      if (data.verified) fetchClaims()
    } finally {
      setVerifying(false)
    }
  }

  const selectClaim = async (claim: DomainClaim) => {
    setSelectedClaim(claim)
    setVerifyResult(null)
    setOrgSettings(claim.orgSettings)

    if (claim.verifiedAt) {
      setLoadingAccounts(true)
      try {
        const res = await fetch(`/api/domain-claims/accounts?claimId=${claim.id}`)
        if (res.ok) setAccounts(await res.json())
      } finally {
        setLoadingAccounts(false)
      }
    }
  }

  const saveOrgSettings = async () => {
    if (!selectedClaim || !orgSettings) return
    setSavingSettings(true)
    try {
      const res = await fetch("/api/domain-claims/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaim.id,
          enforceSSO: orgSettings.enforceSSO,
          enforceBranding: orgSettings.enforceBranding,
          brandColors: orgSettings.brandColors,
          brandLogo: orgSettings.brandLogo,
          brandFooter: orgSettings.brandFooter,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrgSettings(updated)
        fetchClaims()
      }
    } finally {
      setSavingSettings(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    )
  }

  return (
    <PlanGate feature="customDomain" featureLabel="Custom Domain" description="Use your own domain for a professional booking experience.">
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard/settings" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft size={20} />
          </Link>
          <Building2 size={24} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Domain Control</h1>
            <p className="text-gray-500 text-sm">Claim your domain, manage accounts, and enforce organization branding</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Domain List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Your Domains</h2>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && addDomain()}
                />
                <button
                  onClick={addDomain}
                  disabled={adding || !newDomain}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {adding ? "..." : "Add"}
                </button>
              </div>
              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <div className="space-y-2">
                {claims.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">No domains claimed yet</p>
                )}
                {claims.map((claim) => (
                  <button
                    key={claim.id}
                    onClick={() => selectClaim(claim)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedClaim?.id === claim.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-gray-400" />
                        <span className="font-medium text-sm">{claim.domain}</span>
                      </div>
                      {claim.verifiedAt ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <Check size={12} /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={12} /> Pending
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {!selectedClaim ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Globe size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-500">Select a domain to manage</h3>
                <p className="text-gray-400 text-sm mt-1">Or add a new domain to get started</p>
              </div>
            ) : !selectedClaim.verifiedAt ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Verify {selectedClaim.domain}</h2>
                  <button onClick={() => deleteClaim(selectedClaim.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">Add the following TXT record to your domain&apos;s DNS:</p>
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3">
                    <code className="flex-1 text-sm font-mono text-gray-800 break-all">
                      letsmeet-verify={selectedClaim.verificationToken}
                    </code>
                    <button
                      onClick={() => copyToClipboard(`letsmeet-verify=${selectedClaim.verificationToken}`)}
                      className="text-gray-400 hover:text-gray-600 shrink-0"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Record type: TXT &bull; Host: @ &bull; TTL: any</p>
                </div>
                <button
                  onClick={() => verifyDomain(selectedClaim)}
                  disabled={verifying}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifying ? <><RefreshCw size={16} className="animate-spin" /> Checking DNS...</> : <><Check size={16} /> Verify Domain</>}
                </button>
                {verifyResult && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${verifyResult.verified ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                    {verifyResult.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Domain header */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Check size={20} className="text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{selectedClaim.domain}</h2>
                        <p className="text-sm text-gray-500">Verified {new Date(selectedClaim.verifiedAt!).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteClaim(selectedClaim.id)} className="text-red-500 hover:text-red-700 p-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Admin Controls */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-blue-600" /> Admin Controls
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Enforce SSO</span>
                        <p className="text-xs text-gray-400">Require all domain users to sign in via SSO</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={orgSettings?.enforceSSO ?? false}
                        onChange={(e) => setOrgSettings((prev) => prev ? { ...prev, enforceSSO: e.target.checked } : prev)}
                        className="w-5 h-5 rounded text-blue-600"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Enforce Branding</span>
                        <p className="text-xs text-gray-400">Override individual user branding with org branding</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={orgSettings?.enforceBranding ?? false}
                        onChange={(e) => setOrgSettings((prev) => prev ? { ...prev, enforceBranding: e.target.checked } : prev)}
                        className="w-5 h-5 rounded text-blue-600"
                      />
                    </label>
                  </div>
                </div>

                {/* Org Branding */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Palette size={18} className="text-purple-600" /> Organization Branding
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(orgSettings?.brandColors as any)?.primary || "#0066FF"}
                          onChange={(e) => setOrgSettings((prev) => prev ? { ...prev, brandColors: { ...((prev.brandColors as any) || {}), primary: e.target.value } } : prev)}
                          className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={(orgSettings?.brandColors as any)?.primary || "#0066FF"}
                          onChange={(e) => setOrgSettings((prev) => prev ? { ...prev, brandColors: { ...((prev.brandColors as any) || {}), primary: e.target.value } } : prev)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(orgSettings?.brandColors as any)?.accent || "#6366F1"}
                          onChange={(e) => setOrgSettings((prev) => prev ? { ...prev, brandColors: { ...((prev.brandColors as any) || {}), accent: e.target.value } } : prev)}
                          className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={(orgSettings?.brandColors as any)?.accent || "#6366F1"}
                          onChange={(e) => setOrgSettings((prev) => prev ? { ...prev, brandColors: { ...((prev.brandColors as any) || {}), accent: e.target.value } } : prev)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                      <input
                        type="url"
                        value={orgSettings?.brandLogo || ""}
                        onChange={(e) => setOrgSettings((prev) => prev ? { ...prev, brandLogo: e.target.value || null } : prev)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                      <input
                        type="text"
                        value={orgSettings?.brandFooter || ""}
                        onChange={(e) => setOrgSettings((prev) => prev ? { ...prev, brandFooter: e.target.value || null } : prev)}
                        placeholder="© 2026 Acme Corp. All rights reserved."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={saveOrgSettings}
                    disabled={savingSettings}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingSettings ? "Saving..." : "Save Settings"}
                  </button>
                </div>

                {/* Domain Accounts */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users size={18} className="text-green-600" /> Domain Accounts
                    <span className="text-xs text-gray-400 font-normal">({accounts.length} user{accounts.length !== 1 ? "s" : ""})</span>
                  </h3>
                  {loadingAccounts ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw size={20} className="animate-spin text-gray-400" />
                    </div>
                  ) : accounts.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">No accounts found with @{selectedClaim.domain} emails</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 text-gray-500 font-medium">User</th>
                            <th className="text-center py-2 text-gray-500 font-medium">Event Types</th>
                            <th className="text-center py-2 text-gray-500 font-medium">Bookings</th>
                            <th className="text-right py-2 text-gray-500 font-medium">Last Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.map((account) => (
                            <tr key={account.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  {account.image ? (
                                    <img src={account.image} alt="" className="w-8 h-8 rounded-full" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                      {(account.name || account.email)[0]?.toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900">{account.name || "—"}</p>
                                    <p className="text-xs text-gray-400">{account.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 text-center text-gray-600">{account.eventTypesCount}</td>
                              <td className="py-3 text-center text-gray-600">{account.bookingsCount}</td>
                              <td className="py-3 text-right text-gray-400 text-xs">{new Date(account.lastActive).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </PlanGate>
  )
}
