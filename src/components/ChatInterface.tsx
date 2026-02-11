'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, Bot, User, ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface ActionResult {
  action: string
  result: {
    success: boolean
    message: string
    data?: Record<string, unknown>
    confirmationRequired?: boolean
    confirmationMessage?: string
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: ActionResult[]
  timestamp?: number
}

// Parse markdown links [text](url) and render as clickable links
function renderMessageContent(content: string, isUser: boolean) {
  // Strip pending action metadata (HTML comments used for multi-turn state)
  content = content.replace(/<!--\s*PENDING:.*?-->/gs, "").trim()
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    const [, text, href] = match
    parts.push(
      <a
        key={match.index}
        href={href}
        className={`underline font-medium ${isUser ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
      >
        {text}
        {!href.startsWith('/') && <ExternalLink size={12} className="inline ml-0.5 -mt-0.5" />}
      </a>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length > 0 ? parts : content
}

// Action result card component
function ActionCard({ action }: { action: ActionResult }) {
  const { result } = action
  const data = result.data || {}

  // Event type created
  if (action.action === 'create_event_type' && result.success && data.eventType) {
    const et = data.eventType as { title: string; duration: number; locationType: string }
    const bookingUrl = data.bookingUrl as string | null
    return (
      <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-1.5 text-green-700 font-medium mb-1">
          <CheckCircle size={14} /> Event Type Created
        </div>
        <div className="text-gray-700 space-y-0.5">
          <div><span className="font-medium">{et.title}</span> · {et.duration} min</div>
          <div className="text-gray-500 text-xs">{et.locationType.replace(/_/g, ' ')}</div>
          {bookingUrl && (
            <a href={bookingUrl} className="text-blue-600 hover:underline text-xs flex items-center gap-1 mt-1">
              View booking page <ExternalLink size={10} />
            </a>
          )}
        </div>
        <a href={data.dashboardUrl as string || '/dashboard/event-types'} className="text-blue-600 hover:underline text-xs mt-1 block">
          Manage event types →
        </a>
      </div>
    )
  }

  // Bookings list
  if (action.action === 'list_bookings' && result.success && data.bookings) {
    const bookings = data.bookings as Array<{
      id: string; eventType: string; guestName: string; startTime: string; status: string; duration: number
    }>
    if (bookings.length === 0) return null
    return (
      <div className="mt-2 space-y-1.5">
        {bookings.slice(0, 5).map((b) => (
          <div key={b.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-800">{b.eventType}</div>
                <div className="text-gray-500 text-xs">{b.guestName}</div>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>{b.status}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(b.startTime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {' · '}{b.duration} min
            </div>
          </div>
        ))}
        {bookings.length > 5 && (
          <div className="text-xs text-gray-500 text-center">+{bookings.length - 5} more</div>
        )}
      </div>
    )
  }

  // Event types list
  if (action.action === 'list_event_types' && result.success && data.eventTypes) {
    const eventTypes = data.eventTypes as Array<{
      id: string; title: string; slug: string; duration: number; isActive: boolean; color: string; _count?: { bookings: number }
    }>
    if (eventTypes.length === 0) return null
    return (
      <div className="mt-2 space-y-1.5">
        {eventTypes.map((et) => (
          <div key={et.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: et.color }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 truncate">{et.title}</div>
              <div className="text-xs text-gray-500">{et.duration} min · /{et.slug}</div>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${et.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {et.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Analytics summary
  if (action.action === 'get_analytics_summary' && result.success && data.stats) {
    const stats = data.stats as { totalBookings: number; thisWeek: number; thisMonth: number; upcoming: number; cancelled: number; eventTypes: number }
    return (
      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="font-medium text-blue-700 mb-1.5">📊 Quick Stats</div>
        <div className="grid grid-cols-2 gap-1.5 text-gray-700 text-xs">
          <div>Total bookings: <span className="font-medium">{stats.totalBookings}</span></div>
          <div>This week: <span className="font-medium">{stats.thisWeek}</span></div>
          <div>This month: <span className="font-medium">{stats.thisMonth}</span></div>
          <div>Upcoming: <span className="font-medium">{stats.upcoming}</span></div>
          <div>Cancelled: <span className="font-medium">{stats.cancelled}</span></div>
          <div>Event types: <span className="font-medium">{stats.eventTypes}</span></div>
        </div>
        <a href="/dashboard/analytics" className="text-blue-600 hover:underline text-xs mt-1.5 block">
          View full analytics →
        </a>
      </div>
    )
  }

  // Confirmation required
  if (result.confirmationRequired) {
    return (
      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-1.5 text-amber-700 font-medium mb-1">
          <AlertTriangle size={14} /> Confirmation Required
        </div>
        <div className="text-gray-700 text-sm">{result.confirmationMessage || result.message}</div>
      </div>
    )
  }

  // Generic success/failure
  if (result.success === false && !result.confirmationRequired) {
    return (
      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2.5 text-sm">
        <div className="flex items-center gap-1.5 text-red-600">
          <XCircle size={14} /> {result.message}
        </div>
      </div>
    )
  }

  return null
}

const QUICK_ACTIONS = [
  { label: '📅 My meetings', message: 'Show my upcoming meetings' },
  { label: '📋 Event types', message: 'List my event types' },
  { label: '📊 Quick stats', message: 'Show my analytics summary' },
  { label: '⏰ Availability', message: 'Show my availability schedule' },
  { label: '🗳️ Polls', message: 'List my meeting polls' },
  { label: '🔑 API Keys', message: 'Show my API keys' },
  { label: '🔗 Webhooks', message: 'List my webhooks' },
  { label: '🎨 Branding', message: 'Show my branding settings' },
]

export default function ChatInterface() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || isLoading) return

    const userMessage: Message = { role: 'user', content: msg, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const allMessages = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }))
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to get response')
        return
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        actions: data.actions,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setRemaining(data.remainingMessages)
    } catch {
      setError('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 z-50 group"
        aria-label="Open AI assistant"
      >
        <MessageSquare size={24} />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-[420px] h-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <span className="font-semibold text-sm">Assistant</span>
            <div className="flex items-center gap-1 text-xs text-blue-100">
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
              Online · can take actions
            </div>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bot size={24} className="text-blue-600" />
            </div>
            <p className="font-medium text-gray-800 text-sm">Hey! I&apos;m your assistant.</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">I can help you manage your schedule — create events, handle bookings, update settings, and more.</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.message}
                  onClick={() => sendMessage(qa.message)}
                  className="text-xs bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-3 py-1.5 rounded-full border border-gray-200 hover:border-blue-200 transition-colors"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={14} className="text-blue-600" />
              </div>
            )}
            <div className={`max-w-[80%] ${m.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{renderMessageContent(m.content, m.role === 'user')}</p>
              </div>
              {/* Action result cards */}
              {m.actions?.map((action, j) => (
                <ActionCard key={j} action={action} />
              ))}
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={14} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-blue-600" />
            </div>
            <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400 ml-1">thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error & rate limit info */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-xs flex items-center gap-1.5 border-t border-red-100">
          <XCircle size={12} /> {error}
        </div>
      )}
      {remaining !== null && remaining <= 5 && (
        <div className="px-4 py-1 bg-amber-50 text-amber-700 text-xs border-t border-amber-100">
          ⚠️ {remaining} messages remaining this hour
        </div>
      )}

      {/* Quick actions row (after first message) */}
      {messages.length > 0 && messages.length < 3 && !isLoading && (
        <div className="px-3 py-1.5 border-t border-gray-50 flex gap-1.5 overflow-x-auto">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.message}
              onClick={() => sendMessage(qa.message)}
              className="text-xs bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 px-2.5 py-1 rounded-full border border-gray-150 hover:border-blue-200 transition-colors whitespace-nowrap flex-shrink-0"
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Create a meeting, check bookings..."
            className="flex-1 px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
