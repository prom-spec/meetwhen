"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Shield, Save, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface SSOConfig {
  id: string
  domain: string
  entryPoint: string
  issuer: string
  cert: string
  enabled: boolean
}

export default function SSOSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [domain, setDomain] = useState("")
  const [entryPoint, setEntryPoint] = useState("")
  const [issuer, setIssuer] = useState("")
  const [cert, setCert] = useState("")
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated") {
      fetchConfig()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function fetchConfig() {
    try {
      const res = await fetch(`/api/teams/${teamId}/sso`)
      if (!res.ok) throw new Error("Failed to load SSO config")
      const data = await res.json()
      if (data.ssoConfig) {
        setDomain(data.ssoConfig.domain || "")
        setEntryPoint(data.ssoConfig.entryPoint || "")
        setIssuer(data.ssoConfig.issuer || "")
        setCert(data.ssoConfig.cert || "")
        setEnabled(data.ssoConfig.enabled || false)
      }
    } catch {
      // No config yet, that's fine
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`/api/teams/${teamId}/sso`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, entryPoint, issuer, cert, enabled }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      setSuccess("SSO configuration saved successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link
        href={`/dashboard/teams/${teamId}`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to team
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SSO / SAML Configuration</h1>
          <p className="text-sm text-gray-500">
            Configure SAML-based Single Sign-On for your team
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Users with this email domain will be redirected to your IdP
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IdP SSO URL (Entry Point)
            </label>
            <input
              type="url"
              value={entryPoint}
              onChange={(e) => setEntryPoint(e.target.value)}
              placeholder="https://login.example.com/saml/sso"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IdP Entity ID (Issuer)
            </label>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="https://login.example.com/saml/metadata"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IdP X.509 Certificate
            </label>
            <textarea
              value={cert}
              onChange={(e) => setCert(e.target.value)}
              placeholder="Paste the IdP's X.509 certificate here (PEM format, without BEGIN/END headers)"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {enabled ? "SSO Enabled" : "SSO Disabled"}
            </span>
          </div>
        </div>

        {/* IdP Setup Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-medium text-gray-900 mb-3">IdP Setup Instructions</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-700">ACS (Assertion Consumer Service) URL:</p>
              <code className="block mt-1 p-2 bg-white rounded border text-xs break-all">
                {typeof window !== "undefined" ? window.location.origin : "https://letsmeet.link"}/api/auth/sso/callback
              </code>
            </div>
            <div>
              <p className="font-medium text-gray-700">SP Entity ID:</p>
              <code className="block mt-1 p-2 bg-white rounded border text-xs break-all">
                {typeof window !== "undefined" ? window.location.origin : "https://letsmeet.link"}/api/auth/sso/metadata
              </code>
            </div>
            <div className="pt-2 border-t">
              <p className="font-medium text-gray-700 mb-2">Common IdP Guides:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Okta:</strong> Create a new SAML 2.0 app, use the ACS URL and Entity ID above</li>
                <li><strong>Azure AD:</strong> Enterprise Applications → New → SAML → set URLs above</li>
                <li><strong>Google Workspace:</strong> Admin → Apps → Web apps → Add SAML app</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Save SSO Configuration"}
        </button>
      </form>
    </div>
  )
}
