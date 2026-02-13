"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Webhook,
  Plus,
  Trash2,
  Play,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import ConfirmDialog from "@/components/ConfirmDialog"
import PlanGate from "@/components/PlanGate"

interface WebhookData {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  createdAt: string
  stats: {
    totalDeliveries: number
    recentSuccess: number
    recentFailed: number
    lastDelivery: string | null
  }
}

interface DeliveryData {
  id: string
  event: string
  payload: Record<string, unknown>
  status: "PENDING" | "SUCCESS" | "FAILED"
  responseCode: number | null
  responseBody: string | null
  attempts: number
  createdAt: string
}

const WEBHOOK_EVENTS = [
  { value: "booking.created", label: "Booking Created", description: "Triggered when a new booking is made" },
  { value: "booking.cancelled", label: "Booking Cancelled", description: "Triggered when a booking is cancelled" },
  { value: "booking.rescheduled", label: "Booking Rescheduled", description: "Triggered when a booking is rescheduled" },
  { value: "poll.response_added", label: "Poll Response Added", description: "Triggered when someone responds to a meeting poll" },
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUrl, setNewUrl] = useState("")
  const [newEvents, setNewEvents] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  // Secret visibility
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set())

  // Deliveries modal
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([])
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null)

  // Testing state
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null)
  const [confirmDeleteWebhook, setConfirmDeleteWebhook] = useState<string | null>(null)

  useEffect(() => {
    fetchWebhooks()
  }, [])

  async function fetchWebhooks() {
    try {
      const res = await fetch("/api/webhooks")
      if (!res.ok) throw new Error("Failed to fetch webhooks")
      const data = await res.json()
      setWebhooks(data)
    } catch (error) {
      console.error("Error fetching webhooks:", error)
      setMessage({ type: "error", text: "Failed to load webhooks" })
    } finally {
      setLoading(false)
    }
  }

  async function createWebhook() {
    if (!newUrl || newEvents.length === 0) {
      setMessage({ type: "error", text: "URL and at least one event are required" })
      return
    }

    setCreating(true)
    setMessage(null)

    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl, events: newEvents }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create webhook")
      }

      setNewUrl("")
      setNewEvents([])
      setShowCreateForm(false)
      setMessage({ type: "success", text: "Webhook created successfully" })
      fetchWebhooks()
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to create webhook" })
    } finally {
      setCreating(false)
    }
  }

  async function deleteWebhook(id: string) {
    setConfirmDeleteWebhook(id)
  }

  async function executeDeleteWebhook() {
    const id = confirmDeleteWebhook
    if (!id) return
    setConfirmDeleteWebhook(null)
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete webhook")

      setMessage({ type: "success", text: "Webhook deleted" })
      fetchWebhooks()
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete webhook" })
    }
  }

  async function toggleWebhook(id: string, active: boolean) {
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      })

      if (!res.ok) throw new Error("Failed to update webhook")

      fetchWebhooks()
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update webhook" })
    }
  }

  async function testWebhook(id: string) {
    setTestingWebhook(id)
    setMessage(null)

    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: "success", text: "Test webhook sent successfully!" })
      } else {
        setMessage({ type: "error", text: `Test failed: ${data.error}` })
      }

      fetchWebhooks()
    } catch (error) {
      setMessage({ type: "error", text: "Failed to send test webhook" })
    } finally {
      setTestingWebhook(null)
    }
  }

  async function fetchDeliveries(webhookId: string) {
    setSelectedWebhook(webhookId)
    setLoadingDeliveries(true)

    try {
      const res = await fetch(`/api/webhooks/${webhookId}/deliveries?limit=50`)
      if (!res.ok) throw new Error("Failed to fetch deliveries")
      const data = await res.json()
      setDeliveries(data.deliveries)
    } catch (error) {
      console.error("Error fetching deliveries:", error)
    } finally {
      setLoadingDeliveries(false)
    }
  }

  function toggleSecretVisibility(id: string) {
    setVisibleSecrets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setMessage({ type: "success", text: "Copied to clipboard" })
    setTimeout(() => setMessage(null), 2000)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString()
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
    <PlanGate feature="webhooks" featureLabel="Webhooks & API Access" description="Send real-time booking data to your apps and services via webhooks.">
    <div className="px-4 py-6 sm:px-0">
      <ConfirmDialog
        open={!!confirmDeleteWebhook}
        title="Delete Webhook"
        message="Are you sure you want to delete this webhook?"
        confirmLabel="Delete"
        onConfirm={executeDeleteWebhook}
        onCancel={() => setConfirmDeleteWebhook(null)}
      />
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/settings"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Webhook className="h-6 w-6" />
              Webhooks
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Get notified when bookings are created, cancelled, or rescheduled
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052CC] flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Webhook
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Webhook</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                Endpoint URL
              </label>
              <input
                type="url"
                id="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#0066FF] focus:border-[#0066FF] sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Must be HTTPS (localhost allowed for testing)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event.value} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={newEvents.includes(event.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewEvents([...newEvents, event.value])
                        } else {
                          setNewEvents(newEvents.filter((ev) => ev !== event.value))
                        }
                      }}
                      className="mt-1 h-4 w-4 text-[#0066FF] focus:ring-[#0066FF] border-gray-300 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{event.label}</p>
                      <p className="text-sm text-gray-500">{event.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewUrl("")
                  setNewEvents([])
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createWebhook}
                disabled={creating || !newUrl || newEvents.length === 0}
                className="px-4 py-2 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052CC] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Webhook
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Webhook className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks configured</h3>
          <p className="text-gray-500 mb-4">
            Create a webhook to get notified when booking events occur
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052CC] inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Your First Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        webhook.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {webhook.active ? "Active" : "Inactive"}
                    </span>
                    {webhook.stats.recentFailed > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        <AlertCircle className="h-3 w-3" />
                        {webhook.stats.recentFailed} failed
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-mono text-gray-700 truncate mb-2">{webhook.url}</p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  {/* Secret */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-500">Secret:</span>
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {visibleSecrets.has(webhook.id) ? webhook.secret : "whsec_••••••••••••••••"}
                    </code>
                    <button
                      onClick={() => toggleSecretVisibility(webhook.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title={visibleSecrets.has(webhook.id) ? "Hide" : "Show"}
                    >
                      {visibleSecrets.has(webhook.id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(webhook.secret)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="text-sm text-gray-500">
                    {webhook.stats.totalDeliveries} total deliveries
                    {webhook.stats.lastDelivery && (
                      <> • Last: {formatDate(webhook.stats.lastDelivery)}</>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => fetchDeliveries(webhook.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title="View deliveries"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => testWebhook(webhook.id)}
                    disabled={testingWebhook === webhook.id}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                    title="Send test"
                  >
                    {testingWebhook === webhook.id ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleWebhook(webhook.id, webhook.active)}
                    className={`p-2 rounded ${
                      webhook.active
                        ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                        : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                    }`}
                    title={webhook.active ? "Disable" : "Enable"}
                  >
                    {webhook.active ? <X className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deliveries Modal */}
      {selectedWebhook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-medium">Delivery History</h2>
              <button
                onClick={() => {
                  setSelectedWebhook(null)
                  setDeliveries([])
                  setExpandedDelivery(null)
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loadingDeliveries ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : deliveries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No deliveries yet</div>
              ) : (
                <div className="space-y-2">
                  {deliveries.map((delivery) => (
                    <div key={delivery.id} className="border rounded-lg">
                      <button
                        onClick={() =>
                          setExpandedDelivery(expandedDelivery === delivery.id ? null : delivery.id)
                        }
                        className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              delivery.status === "SUCCESS"
                                ? "bg-green-500"
                                : delivery.status === "FAILED"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                            }`}
                          />
                          <span className="font-medium text-sm">{delivery.event}</span>
                          <span className="text-sm text-gray-500">
                            {delivery.responseCode && `HTTP ${delivery.responseCode}`}
                          </span>
                          <span className="text-xs text-gray-400">
                            {delivery.attempts} attempt{delivery.attempts !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{formatDate(delivery.createdAt)}</span>
                          {expandedDelivery === delivery.id ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {expandedDelivery === delivery.id && (
                        <div className="p-3 border-t bg-gray-50 space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Payload</p>
                            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                              {JSON.stringify(delivery.payload, null, 2)}
                            </pre>
                          </div>
                          {delivery.responseBody && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Response</p>
                              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                                {delivery.responseBody}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documentation */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Guide</h3>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">Verifying Webhooks</h4>
            <p className="text-gray-600 mb-2">
              Each webhook request includes a signature in the <code className="bg-white px-1 rounded">X-Webhook-Signature</code> header.
              Verify it using HMAC-SHA256:
            </p>
            <pre className="bg-white p-3 rounded border text-xs overflow-auto">
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expected;
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-1">Request Headers</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><code className="bg-white px-1 rounded">X-LetsMeet-Signature</code> - HMAC-SHA256 signature</li>
              <li><code className="bg-white px-1 rounded">X-LetsMeet-Timestamp</code> - Unix timestamp</li>
              <li><code className="bg-white px-1 rounded">X-Webhook-Event</code> - Event type</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-1">Retry Policy</h4>
            <p className="text-gray-600">
              Failed deliveries are retried up to 3 times with exponential backoff (1 min, 5 min, 30 min).
            </p>
          </div>
        </div>
      </div>
    </div>
    </PlanGate>
  )
}
