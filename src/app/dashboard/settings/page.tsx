"use client"

import { useState, useEffect } from "react"
import { Calendar, Check, X, RefreshCw, Settings, User, Globe, Webhook, ChevronRight, Key, Copy, Trash2, Plus, Bot, Link2, Unlink, Palette, ScrollText } from "lucide-react"
import Link from "next/link"
import ConfirmDialog from "@/components/ConfirmDialog"

interface CalendarInfo {
  id: string
  summary: string
  primary: boolean
  backgroundColor: string | null
}

interface AccountCalendars {
  id: string
  email: string | null
  calendars: CalendarInfo[]
  error?: string
}

interface LinkedAccount {
  id: string
  provider: string
  email: string | null
  hasCalendarScope: boolean
  isPrimary: boolean
}

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
}

interface UserSettings {
  id: string
  name: string | null
  email: string
  username: string | null
  timezone: string
  calendarSyncEnabled: boolean
  blockHolidays: boolean
  holidayCountry: string | null
  brandColor: string | null
  accentColor: string | null
  brandLogo: string | null
  hidePoweredBy: boolean
  gaTrackingId: string | null
  metaPixelId: string | null
  googleConnected: boolean
  hasCalendarScope: boolean
}

function McpConfigBlock({ title, description, configPath, apiKey, config }: {
  title: string
  description: string
  configPath: string
  apiKey: string | null
  config: (key: string) => string
}) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const keyDisplay = apiKey || "YOUR_API_KEY"
  const configText = config(keyDisplay)
  const needsKey = !apiKey

  const handleCopy = () => {
    if (needsKey) return
    navigator.clipboard.writeText(configText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <span className="text-sm font-medium text-gray-900">{title}</span>
          <span className="text-xs text-gray-500 ml-2">{description}</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="p-4 border-t border-gray-200">
          {needsKey && (
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
              <Key className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs text-amber-700">Create an API key above first — it will auto-fill here.</span>
            </div>
          )}
          <div className="relative">
            <pre className="p-3 pr-20 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
              {configText}
            </pre>
            <button
              onClick={handleCopy}
              disabled={needsKey}
              className={`absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                needsKey
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : copied
                    ? "bg-green-700 text-green-200"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : needsKey ? "Need key" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Config: <code className="bg-gray-100 px-1 rounded text-gray-500">{configPath}</code>
          </p>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [timezone, setTimezone] = useState("")
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(true)
  const [blockHolidays, setBlockHolidays] = useState(false)
  const [brandColor, setBrandColor] = useState("")
  const [accentColor, setAccentColor] = useState("")
  const [brandLogo, setBrandLogo] = useState("")
  const [hidePoweredBy, setHidePoweredBy] = useState(false)
  const [gaTrackingId, setGaTrackingId] = useState("")
  const [metaPixelId, setMetaPixelId] = useState("")

  // Linked accounts state
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [linkingAccount, setLinkingAccount] = useState(false)
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null)

  // Calendars state
  const [accountCalendars, setAccountCalendars] = useState<AccountCalendars[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(false)

  // Custom Domain state
  const [customDomain, setCustomDomain] = useState("")
  const [domainVerified, setDomainVerified] = useState(false)
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainSaving, setDomainSaving] = useState(false)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const [creatingKey, setCreatingKey] = useState(false)
  const [confirmRevokeKey, setConfirmRevokeKey] = useState<string | null>(null)

  async function fetchCustomDomain() {
    setDomainLoading(true)
    try {
      const res = await fetch("/api/user/custom-domain")
      if (res.ok) {
        const data = await res.json()
        setCustomDomain(data.customDomain || "")
        setDomainVerified(data.verified || false)
      }
    } catch (e) {
      console.error("Error fetching custom domain:", e)
    } finally {
      setDomainLoading(false)
    }
  }

  async function saveCustomDomain() {
    setDomainSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/user/custom-domain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: customDomain.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save domain")
      setCustomDomain(data.customDomain || "")
      setDomainVerified(data.verified || false)
      setMessage({
        type: data.verified ? "success" : "error",
        text: data.verified
          ? "Custom domain verified and active!"
          : "Domain saved but CNAME not yet verified. Make sure your DNS CNAME points to letsmeet.link",
      })
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save domain" })
    } finally {
      setDomainSaving(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchApiKeys()
    fetchLinkedAccounts()
    fetchCalendars()
    fetchCustomDomain()
    
    // Check for link result in URL params
    const params = new URLSearchParams(window.location.search)
    if (params.get("linked") === "true") {
      setMessage({ type: "success", text: "Google account linked successfully!" })
      window.history.replaceState({}, "", "/dashboard/settings")
    } else if (params.get("error") === "account_already_linked") {
      setMessage({ type: "error", text: "This Google account is already linked to another user." })
      window.history.replaceState({}, "", "/dashboard/settings")
    }
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings")
      if (!res.ok) throw new Error("Failed to fetch settings")
      const data = await res.json()
      setSettings(data)
      setName(data.name || "")
      setUsername(data.username || "")
      setTimezone(data.timezone || "UTC")
      setCalendarSyncEnabled(data.calendarSyncEnabled)
      setBlockHolidays(data.blockHolidays ?? false)
      setBrandColor(data.brandColor || "")
      setBrandLogo(data.brandLogo || "")
      setHidePoweredBy(data.hidePoweredBy ?? false)
    } catch (error) {
      console.error("Error fetching settings:", error)
      setMessage({ type: "error", text: "Failed to load settings" })
    } finally {
      setLoading(false)
    }
  }

  async function fetchLinkedAccounts() {
    setLoadingAccounts(true)
    try {
      const res = await fetch("/api/settings/linked-accounts")
      if (res.ok) {
        const data = await res.json()
        setLinkedAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error("Error fetching linked accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  async function fetchCalendars() {
    setLoadingCalendars(true)
    try {
      const res = await fetch("/api/settings/calendars")
      if (res.ok) {
        const data = await res.json()
        setAccountCalendars(data.accounts || [])
      }
    } catch (error) {
      console.error("Error fetching calendars:", error)
    } finally {
      setLoadingCalendars(false)
    }
  }

  async function handleLinkAccount() {
    setLinkingAccount(true)
    try {
      const res = await fetch("/api/settings/link-account", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        window.location.href = data.redirectUrl
      } else {
        setMessage({ type: "error", text: "Failed to initiate account linking" })
        setLinkingAccount(false)
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to initiate account linking" })
      setLinkingAccount(false)
    }
  }

  async function handleUnlinkAccount() {
    const accountId = confirmUnlinkId
    if (!accountId) return
    setConfirmUnlinkId(null)
    try {
      const res = await fetch(`/api/settings/linked-accounts?id=${accountId}`, { method: "DELETE" })
      if (res.ok) {
        fetchLinkedAccounts()
        setMessage({ type: "success", text: "Account unlinked successfully" })
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Failed to unlink account" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to unlink account" })
    }
  }

  async function fetchApiKeys() {
    setLoadingKeys(true)
    try {
      const res = await fetch("/api/settings/api-keys")
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.keys || [])
      }
    } catch (error) {
      console.error("Error fetching API keys:", error)
    } finally {
      setLoadingKeys(false)
    }
  }

  async function createApiKey() {
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setShowNewKey(data.key) // Show the key once
        setNewKeyName("")
        fetchApiKeys() // Refresh list
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Failed to create API key" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to create API key" })
    } finally {
      setCreatingKey(false)
    }
  }

  async function revokeApiKey(keyId: string) {
    setConfirmRevokeKey(keyId)
  }

  async function executeRevokeApiKey() {
    const keyId = confirmRevokeKey
    if (!keyId) return
    setConfirmRevokeKey(null)
    try {
      const res = await fetch(`/api/settings/api-keys?id=${keyId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchApiKeys()
        setMessage({ type: "success", text: "API key revoked" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to revoke API key" })
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setMessage({ type: "success", text: "Copied to clipboard!" })
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          username: username || null,
          timezone,
          calendarSyncEnabled,
          blockHolidays,
          brandColor: brandColor || null,
          brandLogo: brandLogo || null,
          hidePoweredBy,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save settings")
      }

      const data = await res.json()
      setSettings((prev) => (prev ? { ...prev, ...data } : null))
      setMessage({ type: "success", text: "Settings saved successfully" })
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save" })
    } finally {
      setSaving(false)
    }
  }

  async function handleReconnectGoogle() {
    // Redirect to sign in with Google to re-authorize with calendar scope
    window.location.href = "/api/auth/signin/google?callbackUrl=/dashboard/settings"
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <ConfirmDialog
        open={!!confirmRevokeKey}
        title="Revoke API Key"
        message="Are you sure you want to revoke this API key? This cannot be undone."
        confirmLabel="Revoke"
        onConfirm={executeRevokeApiKey}
        onCancel={() => setConfirmRevokeKey(null)}
      />
      <ConfirmDialog
        open={!!confirmUnlinkId}
        title="Unlink Account"
        message="Are you sure you want to unlink this Google account? You won't be able to sign in with it anymore."
        confirmLabel="Unlink"
        onConfirm={handleUnlinkAccount}
        onCancel={() => setConfirmUnlinkId(null)}
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and calendar preferences
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#0066FF] focus:border-[#0066FF] sm:text-sm"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  letsmeet.link/
                </span>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="flex-1 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-[#0066FF] focus:border-[#0066FF] sm:text-sm"
                  placeholder="username"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This is your public booking URL
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={settings?.email || ""}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                <Globe className="h-4 w-4 inline mr-1" />
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#0066FF] focus:border-[#0066FF] sm:text-sm"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (US)</option>
                <option value="America/Chicago">Central Time (US)</option>
                <option value="America/Denver">Mountain Time (US)</option>
                <option value="America/Los_Angeles">Pacific Time (US)</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Europe/Berlin">Berlin</option>
                <option value="Asia/Jerusalem">Jerusalem</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Shanghai">Shanghai</option>
                <option value="Australia/Sydney">Sydney</option>
              </select>
            </div>
          </div>
        </div>

        {/* Calendar Integration Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </h2>

          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    settings?.googleConnected && settings?.hasCalendarScope
                      ? "bg-green-500"
                      : settings?.googleConnected
                      ? "bg-yellow-500"
                      : "bg-gray-300"
                  }`}
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {settings?.googleConnected
                      ? settings?.hasCalendarScope
                        ? "Google Calendar Connected"
                        : "Connected (Calendar access needed)"
                      : "Not Connected"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {settings?.googleConnected
                      ? settings?.hasCalendarScope
                        ? "Your bookings will sync with Google Calendar"
                        : "Re-connect to grant calendar access"
                      : "Connect your Google account to sync events"}
                  </p>
                </div>
              </div>

              {(!settings?.googleConnected || !settings?.hasCalendarScope) && (
                <button
                  onClick={handleReconnectGoogle}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {settings?.googleConnected ? "Re-connect" : "Connect Google"}
                </button>
              )}
            </div>

            {/* Calendar Sync Toggle */}
            {settings?.googleConnected && settings?.hasCalendarScope && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Sync bookings to calendar</p>
                  <p className="text-sm text-gray-500">
                    Automatically create Google Calendar events for new bookings
                  </p>
                </div>
                <button
                  onClick={() => setCalendarSyncEnabled(!calendarSyncEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2 ${
                    calendarSyncEnabled ? "bg-[#0066FF]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      calendarSyncEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Conflict Checking Info */}
            {settings?.googleConnected && settings?.hasCalendarScope && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Conflict checking is always active.</strong> When guests book with you,
                  we check <strong>all calendars across all your linked Google accounts</strong> to prevent double-bookings.
                </p>
              </div>
            )}

            {/* Calendars Being Checked */}
            {settings?.googleConnected && settings?.hasCalendarScope && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Calendars checked for conflicts</h3>
                  <button
                    onClick={fetchCalendars}
                    disabled={loadingCalendars}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingCalendars ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                {loadingCalendars ? (
                  <div className="flex justify-center py-4">
                    <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : accountCalendars.length > 0 ? (
                  <div className="space-y-3">
                    {accountCalendars.map((acc) => (
                      <div key={acc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                          <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">{acc.email || "Google Account"}</span>
                          {acc.error && (
                            <span className="ml-auto text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">{acc.error}</span>
                          )}
                        </div>
                        {acc.calendars.length > 0 ? (
                          <ul className="divide-y divide-gray-100">
                            {acc.calendars.map((cal) => (
                              <li key={cal.id} className="px-4 py-2 flex items-center gap-2 text-sm">
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cal.backgroundColor || "#4285F4" }}
                                />
                                <span className="text-gray-700">{cal.summary}</span>
                                {cal.primary && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Primary</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : !acc.error ? (
                          <p className="px-4 py-2 text-xs text-gray-500">No calendars found</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No linked accounts with calendar access.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Linked Accounts Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Linked Google Accounts
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Link multiple Google accounts to check availability across all your calendars.
          </p>

          {loadingAccounts ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : linkedAccounts.length > 0 ? (
            <div className="space-y-3 mb-4">
              {linkedAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {acc.email || "Google Account"}
                        {acc.isPrimary && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Primary</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {acc.hasCalendarScope ? "Calendar access granted" : "No calendar access"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!acc.isPrimary && (
                      <button
                        onClick={async () => {
                          await fetch("/api/settings", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ primaryAccountId: acc.providerAccountId }),
                          })
                          fetchLinkedAccounts()
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Set as Primary
                      </button>
                    )}
                    {!acc.isPrimary && (
                      <button
                        onClick={() => setConfirmUnlinkId(acc.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        title="Unlink account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">No linked accounts found.</p>
          )}

          <button
            onClick={handleLinkAccount}
            disabled={linkingAccount}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {linkingAccount ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Link Another Google Account
          </button>
        </div>

        {/* Branding Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Customize how your public booking pages look to guests.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="brandColor" className="block text-sm font-medium text-gray-700">
                Brand Color
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  id="brandColor"
                  value={brandColor || "#0066FF"}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={brandColor || ""}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#0066FF"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#0066FF] focus:border-[#0066FF] sm:text-sm font-mono"
                />
                {brandColor && (
                  <button
                    onClick={() => setBrandColor("")}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Applied to buttons and accent elements on your booking page
              </p>
            </div>

            <div>
              <label htmlFor="brandLogo" className="block text-sm font-medium text-gray-700">
                Logo URL
              </label>
              <input
                type="url"
                id="brandLogo"
                value={brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#0066FF] focus:border-[#0066FF] sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Replaces the letsmeet.link logo on your booking pages
              </p>
            </div>

            {/* Hide Powered By — hidden until premium tier is available */}

            {/* Preview */}
            {(brandColor || brandLogo) && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-xs font-medium text-gray-500 mb-3">Preview</p>
                <div className="flex items-center gap-3 mb-3">
                  {brandLogo && (
                    <img src={brandLogo} alt="Logo preview" className="h-8 max-w-[120px] object-contain" />
                  )}
                </div>
                <button
                  className="px-4 py-2 text-white text-sm font-medium rounded-lg"
                  style={{ backgroundColor: brandColor || "#0066FF" }}
                >
                  Confirm Booking
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Tracking */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics Tracking</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Analytics Tracking ID</label>
              <input type="text" value={gaTrackingId} onChange={e => setGaTrackingId(e.target.value)} placeholder="G-XXXXXXXXXX" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <p className="text-xs text-gray-500 mt-1">Injected on your public booking pages</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Pixel ID</label>
              <input type="text" value={metaPixelId} onChange={e => setMetaPixelId(e.target.value)} placeholder="1234567890" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <p className="text-xs text-gray-500 mt-1">Facebook/Meta pixel for tracking conversions</p>
            </div>
          </div>
        </div>

        {/* Custom Domain Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Domain
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Use your own domain for your booking page instead of letsmeet.link/{settings?.username || "username"}.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700">
                Domain
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                  placeholder="meet.yourdomain.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#0066FF] focus:border-[#0066FF] sm:text-sm"
                />
                <button
                  onClick={saveCustomDomain}
                  disabled={domainSaving}
                  className="px-4 py-2 bg-[#0066FF] text-white rounded-md text-sm font-medium hover:bg-[#0052CC] disabled:opacity-50 flex items-center gap-2"
                >
                  {domainSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {domainSaving ? "Verifying..." : "Save & Verify"}
                </button>
              </div>
            </div>

            {customDomain && (
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                domainVerified
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800"
              }`}>
                {domainVerified ? (
                  <Check className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <RefreshCw className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="text-sm">
                  {domainVerified ? "✓ Domain verified and active" : "⏳ Pending — CNAME not yet detected"}
                </span>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-2">Setup Instructions</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Go to your DNS provider (e.g. Cloudflare, Namecheap, GoDaddy)</li>
                <li>Add a <strong>CNAME</strong> record:</li>
              </ol>
              <div className="mt-2 p-2 bg-gray-900 text-gray-100 rounded text-xs font-mono">
                Type: CNAME<br />
                Name: {customDomain ? customDomain.split(".")[0] : "meet"}<br />
                Target: letsmeet.link
              </div>
              <ol start={3} className="text-sm text-gray-600 space-y-1 list-decimal list-inside mt-2">
                <li>Wait for DNS propagation (usually a few minutes)</li>
                <li>Click &quot;Save &amp; Verify&quot; again to confirm</li>
              </ol>
              <p className="text-xs text-gray-500 mt-3">
                <strong>SSL:</strong> If you use Cloudflare, SSL is automatic via their proxy. Otherwise, your hosting platform (Railway) handles SSL for custom domains.
              </p>
            </div>
          </div>
        </div>

        {/* Holiday Blocking Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            🏖️ National Holidays
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Block national holidays</p>
              <p className="text-sm text-gray-500">
                Automatically prevent bookings on public holidays based on your timezone
              </p>
            </div>
            <button
              onClick={() => setBlockHolidays(!blockHolidays)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2 ${
                blockHolidays ? "bg-[#0066FF]" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  blockHolidays ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {blockHolidays && (
            <p className="text-sm text-green-700 mt-3 p-3 bg-green-50 rounded-lg">
              ✓ Public holidays for your timezone ({timezone.replace(/_/g, " ")}) will be automatically blocked.
            </p>
          )}
        </div>

        {/* Webhooks Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Get notified via HTTP callbacks when bookings are created, cancelled, or rescheduled.
            Perfect for integrating with your own systems.
          </p>

          <Link
            href="/dashboard/settings/webhooks"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Manage Webhooks
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Audit Log Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Audit Log
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            View a complete history of all changes made to your account, including event types,
            bookings, teams, workflows, and settings.
          </p>

          <Link
            href="/dashboard/settings/audit-log"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            View Audit Log
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* AI Assistant Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Connect Your AI Agent
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Give any AI agent the power to manage your calendar via MCP. Create an API key, 
            add it to your AI&apos;s config, and it can book, cancel, and check meetings for you.{" "}
            <Link href="/mcp" className="text-[#0066FF] hover:underline font-medium">
              Read the full MCP setup guide →
            </Link>
          </p>

          {/* New Key Created Alert */}
          {showNewKey && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">
                🎉 API Key Created! Copy it now — you won&apos;t see it again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white border rounded text-sm font-mono break-all">
                  {showNewKey}
                </code>
                <button
                  onClick={() => copyToClipboard(showNewKey)}
                  className="p-2 text-green-700 hover:bg-green-100 rounded"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => setShowNewKey(null)}
                className="mt-2 text-sm text-green-700 hover:underline"
              >
                I&apos;ve saved it, dismiss
              </button>
            </div>
          )}

          {/* Create New Key */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              placeholder="Key name (e.g., Claude Desktop)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#0066FF] focus:border-[#0066FF]"
            />
            <button
              onClick={createApiKey}
              disabled={creatingKey || !newKeyName.trim()}
              className="px-4 py-2 bg-[#0066FF] text-white rounded-md text-sm font-medium hover:bg-[#0052CC] disabled:opacity-50 flex items-center gap-2"
            >
              {creatingKey ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Key
            </button>
          </div>

          {/* Existing Keys */}
          {loadingKeys ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : apiKeys.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {apiKeys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{key.name}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-500">{key.keyPrefix}...</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {new Date(key.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => revokeApiKey(key.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Revoke key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No API keys yet. Create one to get started.
            </p>
          )}

          {/* Setup Instructions for Multiple Clients */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Quick Setup — Copy &amp; Paste</h3>
            <p className="text-xs text-gray-500 mb-3">
              {showNewKey || apiKeys.length > 0
                ? "Your API key is pre-filled in the configs below. Just copy and paste."
                : "Create an API key above first, then your configs will be ready to copy."}
            </p>

            {/* Claude Desktop */}
            <McpConfigBlock
              title="Claude Desktop"
              description="Add to Settings → Developer → MCP Servers"
              configPath="~/Library/Application Support/Claude/claude_desktop_config.json (macOS) or %APPDATA%/Claude/claude_desktop_config.json (Windows)"
              apiKey={showNewKey || (apiKeys.length > 0 ? `${apiKeys[0].keyPrefix}••••••••` : null)}
              config={(key) => `{
  "mcpServers": {
    "letsmeet": {
      "type": "http",
      "url": "https://www.letsmeet.link/api/mcp",
      "headers": {
        "Authorization": "Bearer ${key}"
      }
    }
  }
}`}
            />

            {/* ChatGPT */}
            <McpConfigBlock
              title="ChatGPT (Actions / GPTs)"
              description="Add as an Action in your custom GPT. Use OpenAPI spec."
              configPath="GPT Editor → Actions → Add Action"
              apiKey={showNewKey || (apiKeys.length > 0 ? `${apiKeys[0].keyPrefix}••••••••` : null)}
              config={(key) => `# In your GPT's Action configuration:
Server URL: https://www.letsmeet.link/api/mcp
Authentication: Bearer Token
Token: ${key}

# Or use the OpenAPI schema URL:
https://www.letsmeet.link/api/mcp
Method: POST (JSON-RPC 2.0)`}
            />

            {/* OpenClaw */}
            <McpConfigBlock
              title="OpenClaw"
              description="Add to your mcporter config or use the CLI"
              configPath="mcporter add letsmeet"
              apiKey={showNewKey || (apiKeys.length > 0 ? `${apiKeys[0].keyPrefix}••••••••` : null)}
              config={(key) => `# Via mcporter CLI:
mcporter add letsmeet --type http \\
  --url https://www.letsmeet.link/api/mcp \\
  --header "Authorization: Bearer ${key}"

# Or in config.json:
{
  "mcpServers": {
    "letsmeet": {
      "type": "http",
      "url": "https://www.letsmeet.link/api/mcp",
      "headers": {
        "Authorization": "Bearer ${key}"
      }
    }
  }
}`}
            />

            {/* Cursor */}
            <McpConfigBlock
              title="Cursor"
              description="Add to Cursor Settings → MCP"
              configPath="~/.cursor/mcp.json"
              apiKey={showNewKey || (apiKeys.length > 0 ? `${apiKeys[0].keyPrefix}••••••••` : null)}
              config={(key) => `{
  "mcpServers": {
    "letsmeet": {
      "type": "http",
      "url": "https://www.letsmeet.link/api/mcp",
      "headers": {
        "Authorization": "Bearer ${key}"
      }
    }
  }
}`}
            />

            {/* Windsurf / Cline / Generic */}
            <McpConfigBlock
              title="Windsurf / Cline / Any MCP Client"
              description="Standard MCP HTTP configuration"
              configPath="Check your client's MCP settings location"
              apiKey={showNewKey || (apiKeys.length > 0 ? `${apiKeys[0].keyPrefix}••••••••` : null)}
              config={(key) => `{
  "mcpServers": {
    "letsmeet": {
      "type": "http",
      "url": "https://www.letsmeet.link/api/mcp",
      "headers": {
        "Authorization": "Bearer ${key}"
      }
    }
  }
}`}
            />

            <p className="text-xs text-gray-400 pt-2">
              Need help? Check the{" "}
              <Link href="/mcp" className="text-[#0066FF] hover:underline">full MCP guide</Link>{" "}
              for detailed instructions and available tools.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052CC] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* Danger Zone - Delete Account */}
        <DeleteAccountSection />
      </div>
    </div>
  )
}

function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch("/api/user/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }),
      })
      if (res.ok) {
        window.location.href = "/login"
      } else {
        const data = await res.json()
        setError(data.error || "Failed to delete account")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 border border-red-200">
      <h2 className="text-lg font-medium text-red-600 mb-2 flex items-center gap-2">
        <Trash2 className="h-5 w-5" />
        Danger Zone
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Permanently delete your account and all associated data. This action cannot be undone.
      </p>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
        >
          Delete My Account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-red-700 font-medium">
            Type <code className="bg-red-50 px-1.5 py-0.5 rounded text-red-800">DELETE MY ACCOUNT</code> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            className="w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={confirmText !== "DELETE MY ACCOUNT" || deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Permanently Delete Account"}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(""); setError(null) }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
