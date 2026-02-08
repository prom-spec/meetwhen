"use client"

import { useState, useEffect } from "react"
import { Calendar, Check, X, RefreshCw, Settings, User, Globe, Webhook, ChevronRight, Key, Copy, Trash2, Plus, Bot } from "lucide-react"
import Link from "next/link"
import ConfirmDialog from "@/components/ConfirmDialog"

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
  googleConnected: boolean
  hasCalendarScope: boolean
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

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const [creatingKey, setCreatingKey] = useState(false)
  const [confirmRevokeKey, setConfirmRevokeKey] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
    fetchApiKeys()
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
    } catch (error) {
      console.error("Error fetching settings:", error)
      setMessage({ type: "error", text: "Failed to load settings" })
    } finally {
      setLoading(false)
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
                  meetwhen.app/
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
                  we check your Google Calendar for existing events to prevent double-bookings.
                </p>
              </div>
            )}
          </div>
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

        {/* AI Assistant Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant
          </h2>

          <p className="text-sm text-gray-600 mb-4">
            Connect your AI assistant (like Claude or ChatGPT) to manage your calendar through natural conversation.
            Create an API key below and add it to your AI app.
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

          {/* Setup Instructions */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-[#0066FF] hover:underline">
              Setup instructions for Claude Desktop
            </summary>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm">
              <p className="mb-2">Add this to your Claude Desktop config file:</p>
              <pre className="p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "meetwhen": {
      "command": "npx",
      "args": ["-y", "meetwhen-mcp"],
      "env": {
        "MEETWHEN_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}`}
              </pre>
              <p className="mt-2 text-gray-500">
                Config location: <code className="bg-gray-200 px-1 rounded">~/.config/claude/config.json</code>
              </p>
            </div>
          </details>
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
      </div>
    </div>
  )
}
