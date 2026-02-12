/**
 * Deterministic intent parser for chat actions.
 * Uses regex + keyword matching instead of LLM tool calling.
 */

export interface ParsedIntent {
  action: string | null
  params: Record<string, unknown>
}

interface PendingAction {
  action: string
  params: Record<string, unknown>
  awaitingConfirmation?: boolean
  awaitingParam?: string // which param we're waiting for
}

// ── Parameter Extraction ────────────────────────────────────

function extractDuration(text: string): number | undefined {
  // "1 hour", "1.5 hours", "2 hr"
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr)s?/i)
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60)

  // "30 minute", "45 min", "90 mins"
  const minMatch = text.match(/(\d+)\s*(?:minute|min)s?/i)
  if (minMatch) return parseInt(minMatch[1])

  return undefined
}

function extractTitle(text: string): string | undefined {
  // Quoted text: "Quick Chat" or 'Quick Chat'
  const quoted = text.match(/["']([^"']+)["']/)
  if (quoted) return quoted[1]

  // "called/named/titled X"
  const named = text.match(/(?:called|named|titled)\s+(.+?)(?:\s+(?:with|for|that|and|lasting|\d+\s*(?:min|hour|hr))|\s*$)/i)
  if (named) return named[1].replace(/\s+$/, "")

  return undefined
}

function extractDate(text: string): string | undefined {
  // YYYY-MM-DD
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]

  // "tomorrow"
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  }

  // "next Monday", etc.
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  const nextDay = text.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i)
  if (nextDay) {
    const target = dayNames.indexOf(nextDay[1].toLowerCase())
    const d = new Date()
    const current = d.getDay()
    const diff = ((target - current + 7) % 7) || 7
    d.setDate(d.getDate() + diff)
    return d.toISOString().split("T")[0]
  }

  return undefined
}

function extractUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s]+/)
  return match ? match[0] : undefined
}

function extractCountryCode(text: string): string | undefined {
  const match = text.match(/\b([A-Z]{2})\b/)
  if (match) return match[1]
  // Common names
  const countries: Record<string, string> = {
    "united states": "US", "usa": "US", "us": "US", "america": "US",
    "israel": "IL", "uk": "GB", "united kingdom": "GB", "britain": "GB",
    "canada": "CA", "australia": "AU", "germany": "DE", "france": "FR",
    "india": "IN", "japan": "JP",
  }
  const lower = text.toLowerCase()
  for (const [name, code] of Object.entries(countries)) {
    if (lower.includes(name)) return code
  }
  return undefined
}

function extractColor(text: string): string | undefined {
  const hex = text.match(/#[0-9a-fA-F]{6}\b/)
  if (hex) return hex[0]
  const colors: Record<string, string> = {
    red: "#EF4444", blue: "#3B82F6", green: "#22C55E", purple: "#A855F7",
    orange: "#F97316", pink: "#EC4899", yellow: "#EAB308", teal: "#14B8A6",
  }
  for (const [name, code] of Object.entries(colors)) {
    if (text.toLowerCase().includes(name)) return code
  }
  return undefined
}

function extractTimezone(text: string): string | undefined {
  const match = text.match(/\b((?:America|Europe|Asia|Africa|Pacific|Australia)\/[\w_]+)\b/)
  return match ? match[1] : undefined
}

function extractBooleanIntent(text: string): boolean | undefined {
  if (/\b(enable|activate|turn\s*on|yes|true)\b/i.test(text)) return true
  if (/\b(disable|deactivate|turn\s*off|no|false)\b/i.test(text)) return false
  return undefined
}

function extractEmbedStyle(text: string): string | undefined {
  if (/\bpopup\b/i.test(text)) return "popup"
  if (/\bfloat/i.test(text)) return "floating"
  if (/\binline\b/i.test(text)) return "inline"
  return undefined
}

function extractEvents(text: string): string[] | undefined {
  const events: string[] = []
  if (/\bcreated?\b/i.test(text)) events.push("booking.created")
  if (/\bcancel/i.test(text)) events.push("booking.cancelled")
  if (/\breschedul/i.test(text)) events.push("booking.rescheduled")
  return events.length > 0 ? events : undefined
}

function isConfirmation(text: string): boolean {
  return /^(yes|yeah|yep|yup|confirm|do it|go ahead|sure|ok|okay|proceed|absolutely|affirmative)\b/i.test(text.trim())
}

function isDenial(text: string): boolean {
  return /^(no|nah|nope|cancel|don't|never mind|nevermind|stop|abort)\b/i.test(text.trim())
}

// ── Entity Detection ────────────────────────────────────────

type Entity =
  | "event_type" | "booking" | "availability" | "date_override"
  | "workflow" | "team" | "poll" | "routing_form" | "webhook"
  | "api_key" | "settings" | "branding" | "holiday" | "custom_domain"
  | "linked_account" | "calendar" | "embed" | "analytics"
  | "recurring_booking" | "group_event" | "custom_question"

function detectEntity(text: string): Entity | null {
  const lower = text.toLowerCase()

  // Order matters - more specific first
  if (/\b(recurring|repeat|series)\b/.test(lower)) return "recurring_booking"
  if (/\b(group\s*event|group\s*booking)\b/.test(lower)) return "group_event"
  if (/\bcustom\s*(question|field|form\s*field)\b/.test(lower)) return "custom_question"
  if (/\b(event\s*type|meeting\s*type|meeting|event)\b/.test(lower)) return "event_type"
  if (/\b(booking|appointment|scheduled|upcoming)\b/.test(lower)) return "booking"
  if (/\b(availab|schedule|hours|working)\b/.test(lower)) return "availability"
  if (/\b(date\s*override|block\s*(a\s*)?day|block\s*date|custom\s*hours)\b/.test(lower)) return "date_override"
  if (/\b(workflow|automation)\b/.test(lower)) return "workflow"
  if (/\b(team)\b/.test(lower)) return "team"
  if (/\b(poll|vote|voting)\b/.test(lower)) return "poll"
  if (/\b(routing\s*form|routing)\b/.test(lower)) return "routing_form"
  if (/\b(webhook|hook)\b/.test(lower)) return "webhook"
  if (/\b(api\s*key|key)\b/.test(lower)) return "api_key"
  if (/\b(setting|profile|timezone|time\s*zone)\b/.test(lower)) return "settings"
  if (/\b(brand|logo|powered\s*by|color|theme)\b/.test(lower)) return "branding"
  if (/\b(holiday|holidays)\b/.test(lower)) return "holiday"
  if (/\b(custom\s*domain|domain|dns|cname)\b/.test(lower)) return "custom_domain"
  if (/\b(linked\s*account|oauth|google\s*account)\b/.test(lower)) return "linked_account"
  if (/\b(calendar|sync)\b/.test(lower)) return "calendar"
  if (/\b(embed|widget)\b/.test(lower)) return "embed"
  if (/\b(analytics|stats|statistics|summary)\b/.test(lower)) return "analytics"
  if (/\b(audit\s*log|audit)\b/.test(lower)) return "audit_log"
  if (/\b(sso|saml|single\s*sign)/i.test(lower)) return "sso"
  if (/\b(scim|provision)/i.test(lower)) return "scim"
  if (/\b(screening|qualification)\b/.test(lower)) return "screening"
  if (/\b(sequence|outreach|email\s*sequence)\b/.test(lower)) return "email_sequence"
  if (/\b(pwa|install\s*app|installable)\b/.test(lower)) return "pwa"
  if (/\b(extension|chrome\s*ext|browser\s*ext)\b/.test(lower)) return "extension"

  return null
}

// ── Verb Detection ──────────────────────────────────────────

type Verb = "create" | "list" | "delete" | "update" | "toggle" | "get" | "set" | "verify" | "test" | "close"

function detectVerb(text: string): Verb | null {
  const lower = text.toLowerCase()

  if (/\b(create|make|add|new|set\s*up|generate)\b/.test(lower)) return "create"
  if (/\b(list|show|get|what\s*are|my|view|see|all)\b/.test(lower)) return "list"
  if (/\b(delete|remove|revoke)\b/.test(lower)) return "delete"
  if (/\b(cancel)\b/.test(lower)) return "delete" // cancel maps to delete for bookings
  if (/\b(update|change|edit|modify|rename)\b/.test(lower)) return "update"
  if (/\b(enable|disable|turn\s*on|turn\s*off|activate|deactivate|toggle)\b/.test(lower)) return "toggle"
  if (/\b(verify|check)\b/.test(lower)) return "verify"
  if (/\b(test|ping)\b/.test(lower)) return "test"
  if (/\b(close|finalize)\b/.test(lower)) return "close"
  if (/\b(set|configure)\b/.test(lower)) return "set"

  return null
}

// ── Specific Pattern Matchers ───────────────────────────────

function matchSpecificPatterns(text: string): ParsedIntent | null {
  const lower = text.toLowerCase()

  // "block holidays" / "enable holidays for US"
  if (/\bblock\s*holidays?\b/i.test(text) || /\benable\s*holiday/i.test(text)) {
    return {
      action: "set_holidays",
      params: { blockHolidays: true, holidayCountry: extractCountryCode(text) },
    }
  }

  // "unblock holidays" / "disable holidays"
  if (/\b(unblock|disable)\s*holiday/i.test(text)) {
    return { action: "set_holidays", params: { blockHolidays: false } }
  }

  // "set availability" / "set my hours"
  if (/\bset\s*(my\s*)?(availability|hours|schedule)\b/i.test(text)) {
    return { action: "set_availability", params: {} } // will need multi-turn
  }

  // "get embed code" / "embed code for X"
  if (/\bembed\s*(code|snippet|widget)\b/i.test(text)) {
    return {
      action: "get_embed_code",
      params: {
        eventTypeTitle: extractTitle(text),
        style: extractEmbedStyle(text),
      },
    }
  }

  // "verify domain" / "check DNS"
  if (/\bverify\s*(custom\s*)?domain\b/i.test(text) || /\bcheck\s*dns\b/i.test(text)) {
    return { action: "verify_custom_domain", params: {} }
  }

  // "set domain to X" / "use domain X"
  if (/\b(set|use|add)\s*(custom\s*)?domain\b/i.test(text)) {
    const domain = text.match(/(?:domain\s+(?:to\s+)?|domain\s+)([a-z0-9][\w.-]+\.[a-z]{2,})/i)
    return { action: "set_custom_domain", params: { domain: domain?.[1] } }
  }

  // "block tomorrow" / "block 2026-02-15"
  if (/\bblock\s/i.test(text) && !(/holiday/i.test(text))) {
    const date = extractDate(text)
    if (date) {
      const reason = text.match(/(?:for|because|reason:?)\s+(.+?)$/i)?.[1]
      return { action: "add_date_override", params: { date, isAvailable: false, reason } }
    }
  }

  // "set timezone to X"
  if (/\b(set|change)\s*(my\s*)?timezone\b/i.test(text)) {
    return { action: "update_settings", params: { timezone: extractTimezone(text) } }
  }

  // Analytics
  if (/\b(analytics|stats|statistics|how\s*many\s*bookings|booking\s*summary)\b/i.test(text)) {
    return { action: "get_analytics_summary", params: {} }
  }

  return null
}

// ── Main Intent Parser ──────────────────────────────────────

export function parseIntent(text: string): ParsedIntent {
  // Check specific patterns first
  const specific = matchSpecificPatterns(text)
  if (specific) return specific

  const verb = detectVerb(text)
  const entity = detectEntity(text)

  // No verb and no entity → Q&A
  if (!verb && !entity) return { action: null, params: {} }

  // Entity but no verb → default to list/get
  const effectiveVerb = verb || "list"

  // Map verb+entity to action
  const action = resolveAction(effectiveVerb, entity, text)
  if (!action) return { action: null, params: {} }

  // Extract params based on action
  const params = extractParamsForAction(action, text)

  return { action, params }
}

function resolveAction(verb: Verb, entity: Entity | null, text: string): string | null {
  if (!entity) {
    // Verb without clear entity — try to infer
    if (verb === "list" || verb === "create") return null // too ambiguous
    return null
  }

  const actionMap: Record<string, Record<string, string>> = {
    event_type: {
      create: "create_event_type",
      list: "list_event_types",
      delete: "delete_event_type",
      update: "update_event_type",
      toggle: "toggle_event_type",
      get: "list_event_types",
    },
    booking: {
      list: "list_bookings",
      delete: "cancel_booking",
      get: "list_bookings",
    },
    availability: {
      list: "get_availability",
      get: "get_availability",
      set: "set_availability",
      update: "set_availability",
    },
    date_override: {
      create: "add_date_override",
      set: "add_date_override",
    },
    workflow: {
      list: "list_workflows",
      create: "create_workflow",
      toggle: "toggle_workflow",
      get: "list_workflows",
    },
    team: {
      list: "list_teams",
      create: "create_team",
      get: "list_teams",
    },
    poll: {
      list: "list_polls",
      create: "create_poll",
      delete: "delete_poll",
      close: "close_poll",
      get: "list_polls",
    },
    routing_form: {
      list: "list_routing_forms",
      create: "create_routing_form",
      delete: "delete_routing_form",
      get: "list_routing_forms",
    },
    webhook: {
      list: "list_webhooks",
      create: "create_webhook",
      delete: "delete_webhook",
      test: "test_webhook",
      get: "list_webhooks",
    },
    api_key: {
      list: "list_api_keys",
      create: "create_api_key",
      delete: "delete_api_key",
      get: "list_api_keys",
    },
    settings: {
      list: "get_settings",
      get: "get_settings",
      update: "update_settings",
      set: "update_settings",
    },
    branding: {
      list: "get_branding",
      get: "get_branding",
      update: "update_branding",
      set: "update_branding",
    },
    holiday: {
      list: "get_holidays",
      get: "get_holidays",
      set: "set_holidays",
      update: "set_holidays",
    },
    custom_domain: {
      list: "get_custom_domain",
      get: "get_custom_domain",
      set: "set_custom_domain",
      create: "set_custom_domain",
      verify: "verify_custom_domain",
    },
    linked_account: {
      list: "list_linked_accounts",
      get: "list_linked_accounts",
    },
    calendar: {
      list: "get_calendars",
      get: "get_calendars",
    },
    embed: {
      get: "get_embed_code",
      create: "get_embed_code",
    },
    analytics: {
      list: "get_analytics_summary",
      get: "get_analytics_summary",
    },
    recurring_booking: {
      list: "list_recurring_bookings",
      delete: "cancel_recurring_series",
      get: "list_recurring_bookings",
    },
    group_event: {
      list: "get_group_event_status",
      get: "get_group_event_status",
    },
    custom_question: {
      list: "get_event_questions",
      get: "get_event_questions",
      set: "set_event_questions",
      create: "set_event_questions",
      update: "set_event_questions",
    },
    audit_log: {
      list: "get_audit_logs",
      get: "get_audit_logs",
    },
    sso: {
      list: "get_sso_info",
      get: "get_sso_info",
      set: "get_sso_info",
      create: "get_sso_info",
    },
    scim: {
      list: "get_scim_info",
      get: "get_scim_info",
      set: "get_scim_info",
      create: "get_scim_info",
    },
    screening: {
      list: "get_event_questions",
      get: "get_event_questions",
      set: "set_event_questions",
      create: "set_event_questions",
    },
    email_sequence: {
      list: "list_sequences",
      get: "list_sequences",
      create: "create_sequence",
    },
    pwa: {
      get: "get_pwa_info",
      list: "get_pwa_info",
    },
    extension: {
      get: "get_extension_info",
      list: "get_extension_info",
    },
  }

  return actionMap[entity]?.[verb] || null
}

function extractParamsForAction(action: string, text: string): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  switch (action) {
    case "create_event_type": {
      params.title = extractTitle(text) || "Meeting"
      params.duration = extractDuration(text) || 30
      const color = extractColor(text)
      if (color) params.color = color
      // Location type
      if (/\bzoom\b/i.test(text)) params.locationType = "ZOOM"
      else if (/\bin[\s-]?person\b/i.test(text)) params.locationType = "IN_PERSON"
      else if (/\bphone\b/i.test(text)) params.locationType = "PHONE"
      else if (/\bgoogle\s*meet\b/i.test(text)) params.locationType = "GOOGLE_MEET"
      break
    }

    case "delete_event_type":
    case "update_event_type":
    case "toggle_event_type":
    case "get_embed_code":
    case "get_event_questions": {
      const title = extractTitle(text)
      if (title) params.title = title
      else {
        // Try to grab entity name after verb
        const afterVerb = text.match(/(?:delete|remove|update|change|edit|toggle|enable|disable|embed.*for)\s+(?:the\s+)?(?:event\s*type\s+)?(.+?)(?:\s+event(?:\s*type)?)?$/i)
        if (afterVerb) params.title = afterVerb[1].replace(/\s*event\s*type\s*$/i, "").trim()
      }
      if (action === "delete_event_type") params.confirmed = false
      if (action === "toggle_event_type") {
        params.isActive = extractBooleanIntent(text) ?? true
      }
      if (action === "update_event_type") {
        const duration = extractDuration(text)
        if (duration) params.duration = duration
        const color = extractColor(text)
        if (color) params.color = color
        // "rename to X"
        const rename = text.match(/rename\s+(?:to|as)\s+["']?(.+?)["']?\s*$/i)
        if (rename) params.newTitle = rename[1]
      }
      if (action === "get_embed_code") {
        params.style = extractEmbedStyle(text)
        if (params.title) {
          params.eventTypeTitle = params.title
          delete params.title
        }
      }
      break
    }

    case "list_bookings": {
      if (/\bcancel/i.test(text)) params.status = "CANCELLED"
      else if (/\bpending\b/i.test(text)) params.status = "PENDING"
      else if (/\bpast\b/i.test(text)) params.includePast = true
      else if (/\ball\b/i.test(text)) params.includePast = true
      break
    }

    case "cancel_booking": {
      params.confirmed = false
      // ID would need to come from conversation context
      break
    }

    case "create_team": {
      const title = extractTitle(text)
      if (title) params.name = title
      else {
        const afterVerb = text.match(/(?:create|make|add|new)\s+(?:a\s+)?team\s+(?:called\s+)?(.+?)$/i)
        if (afterVerb) params.name = afterVerb[1].trim()
      }
      break
    }

    case "create_api_key": {
      const title = extractTitle(text)
      if (title) params.name = title
      else {
        const afterVerb = text.match(/(?:create|make|add|new|generate)\s+(?:an?\s+)?(?:api\s*)?key\s+(?:called\s+|named\s+)?(.+?)$/i)
        if (afterVerb) params.name = afterVerb[1].trim()
      }
      break
    }

    case "create_webhook": {
      params.url = extractUrl(text)
      params.events = extractEvents(text) || ["booking.created", "booking.cancelled"]
      break
    }

    case "update_settings": {
      const tz = extractTimezone(text)
      if (tz) params.timezone = tz
      const color = extractColor(text)
      if (color) params.brandColor = color
      break
    }

    case "update_branding": {
      const color = extractColor(text)
      if (color) params.brandColor = color
      if (/\bhide\s*powered/i.test(text)) params.hidePoweredBy = true
      if (/\bshow\s*powered/i.test(text)) params.hidePoweredBy = false
      break
    }

    case "set_holidays": {
      params.blockHolidays = extractBooleanIntent(text) ?? true
      const country = extractCountryCode(text)
      if (country) params.holidayCountry = country
      break
    }

    case "set_custom_domain": {
      const domain = text.match(/(?:domain\s+(?:to\s+)?|domain\s+)([a-z0-9][\w.-]+\.[a-z]{2,})/i)
      if (domain) params.domain = domain[1]
      break
    }

    case "toggle_workflow": {
      params.isActive = extractBooleanIntent(text) ?? true
      const name = extractTitle(text)
      if (name) params.name = name
      break
    }

    case "add_date_override": {
      params.date = extractDate(text)
      params.isAvailable = false
      break
    }
  }

  return params
}

// ── Multi-turn Context ──────────────────────────────────────

/**
 * Extract a pending action from the last assistant message.
 * Looks for JSON metadata embedded in the message.
 */
export function extractPendingAction(messages: Array<{ role: string; content: string }>): PendingAction | null {
  // Find the last assistant message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      const content = messages[i].content
      // Look for embedded pending action metadata
      const match = content.match(/<!-- PENDING:(.*?) -->/)
      if (match) {
        try {
          return JSON.parse(match[1]) as PendingAction
        } catch {
          return null
        }
      }
      break // only check the last assistant message
    }
  }
  return null
}

/**
 * Handle multi-turn conversation:
 * - If there's a pending confirmation and user confirms → execute
 * - If there's a pending param and user provides it → fill and retry
 */
export function handleMultiTurn(
  userMessage: string,
  messages: Array<{ role: string; content: string }>
): ParsedIntent | null {
  const pending = extractPendingAction(messages)
  if (!pending) return null

  // Confirmation flow
  if (pending.awaitingConfirmation) {
    if (isConfirmation(userMessage)) {
      return {
        action: pending.action,
        params: { ...pending.params, confirmed: true },
      }
    }
    if (isDenial(userMessage)) {
      return { action: null, params: {} } // cancelled
    }
    return null // unclear response, let regular parsing handle it
  }

  // Missing param flow
  if (pending.awaitingParam) {
    const param = pending.awaitingParam
    let value: unknown = userMessage.trim()

    // Smart extraction based on param type
    if (param === "duration") {
      value = extractDuration(userMessage) || parseInt(userMessage) || undefined
    } else if (param === "title" || param === "name") {
      value = extractTitle(userMessage) || userMessage.trim()
    } else if (param === "date") {
      value = extractDate(userMessage) || userMessage.trim()
    } else if (param === "url") {
      value = extractUrl(userMessage) || userMessage.trim()
    } else if (param === "domain") {
      value = userMessage.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "")
    }

    if (value !== undefined) {
      return {
        action: pending.action,
        params: { ...pending.params, [param]: value },
      }
    }
  }

  return null
}

// ── Response Formatting ─────────────────────────────────────

export function formatPendingMetadata(pending: PendingAction): string {
  return `<!-- PENDING:${JSON.stringify(pending)} -->`
}

/**
 * Check which required params are missing for an action
 */
export function getMissingParams(action: string, params: Record<string, unknown>): string | null {
  const required: Record<string, string[]> = {
    create_team: ["name"],
    create_api_key: ["name"],
    create_webhook: ["url"],
    set_custom_domain: ["domain"],
    add_date_override: ["date"],
  }

  const reqs = required[action]
  if (!reqs) return null

  for (const param of reqs) {
    if (params[param] === undefined || params[param] === null) {
      return param
    }
  }
  return null
}

/**
 * Format action result as a user-friendly message
 */
export function formatActionResult(action: string, result: { success: boolean; message: string; data?: Record<string, unknown>; confirmationRequired?: boolean; confirmationMessage?: string }): string {
  if (result.confirmationRequired) {
    const pending: PendingAction = {
      action,
      params: result.data || {},
      awaitingConfirmation: true,
    }
    return `⚠️ ${result.confirmationMessage || result.message}\n\nReply **yes** to confirm or **no** to cancel.\n${formatPendingMetadata(pending)}`
  }

  if (!result.success) {
    return `❌ ${result.message}`
  }

  // Custom formatting per action
  switch (action) {
    case "create_event_type": {
      const d = result.data as Record<string, unknown> | undefined
      const et = d?.eventType as Record<string, unknown> | undefined
      const url = d?.bookingUrl || d?.dashboardUrl || "/dashboard/event-types"
      return `✅ Created event type **${et?.title}** (${et?.duration} min, ${et?.locationType || "Google Meet"}). [View →](${url})`
    }

    case "list_event_types": {
      const d = result.data as Record<string, unknown> | undefined
      const types = (d?.eventTypes || []) as Array<Record<string, unknown>>
      if (types.length === 0) return "📋 You don't have any event types yet. Want me to create one?"
      const lines = types.map((t) => `• **${t.title}** — ${t.duration} min ${t.isActive ? "✅" : "⏸️"} (${(t._count as Record<string, number>)?.bookings ?? 0} bookings)`)
      return `📋 You have ${types.length} event type(s):\n${lines.join("\n")}\n\n[Manage →](/dashboard/event-types)`
    }

    case "list_bookings": {
      const d = result.data as Record<string, unknown> | undefined
      const bookings = (d?.bookings || []) as Array<Record<string, unknown>>
      if (bookings.length === 0) return "📋 No upcoming bookings."
      const lines = bookings.map((b) => {
        const start = new Date(b.startTime as string)
        return `• **${b.eventType}** with ${b.guestName} — ${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (${b.status})`
      })
      return `📋 ${bookings.length} booking(s):\n${lines.join("\n")}\n\n[View all →](/dashboard/bookings)`
    }

    case "get_availability": {
      const d = result.data as Record<string, unknown> | undefined
      const schedule = (d?.schedule || []) as Array<{ day: string; enabled: boolean; slots: Array<{ startTime: string; endTime: string }> }>
      const lines = schedule.map((s) => {
        if (!s.enabled) return `• ${s.day}: Off`
        return `• ${s.day}: ${s.slots.map((sl) => `${sl.startTime}–${sl.endTime}`).join(", ")}`
      })
      return `🕐 Your availability:\n${lines.join("\n")}\n\n[Edit →](/dashboard/availability)`
    }

    case "get_analytics_summary": {
      const d = result.data as Record<string, unknown> | undefined
      const stats = d?.stats as Record<string, number> | undefined
      if (!stats) return "📊 No analytics available."
      return `📊 **Analytics Summary**\n• Total bookings: ${stats.totalBookings}\n• This week: ${stats.thisWeek}\n• This month: ${stats.thisMonth}\n• Upcoming: ${stats.upcoming}\n• Cancelled: ${stats.cancelled}\n• Event types: ${stats.eventTypes}\n\n[Full analytics →](/dashboard/analytics)`
    }

    case "get_embed_code": {
      const d = result.data as Record<string, unknown> | undefined
      return `📦 Here's your **${d?.style || "inline"}** embed code:\n\n\`\`\`html\n${d?.code}\n\`\`\`\n\nBooking URL: ${d?.url}`
    }

    case "list_workflows": {
      const d = result.data as Record<string, unknown> | undefined
      const workflows = (d?.workflows || []) as Array<Record<string, unknown>>
      if (workflows.length === 0) return "📋 No workflows yet. Want me to create one?"
      const lines = workflows.map((w) => `• **${w.name}** — ${w.trigger} ${w.isActive ? "✅" : "⏸️"} (${w.steps} steps, ${w.executions} runs)`)
      return `📋 ${workflows.length} workflow(s):\n${lines.join("\n")}\n\n[Manage →](/dashboard/workflows)`
    }

    case "list_api_keys": {
      const d = result.data as Record<string, unknown> | undefined
      const keys = (d?.apiKeys || []) as Array<Record<string, unknown>>
      if (keys.length === 0) return "🔑 No API keys. Want me to create one?"
      const lines = keys.map((k) => `• **${k.name}** (${k.keyPrefix}...)`)
      return `🔑 ${keys.length} API key(s):\n${lines.join("\n")}\n\n[Manage →](/dashboard/api-keys)`
    }

    case "create_api_key": {
      return `🔑 ${result.message}`
    }

    default:
      // Generic formatting
      return `${result.success ? "✅" : "❌"} ${result.message}`
  }
}

/**
 * Format a prompt asking for a missing parameter
 */
export function formatMissingParamPrompt(action: string, param: string, currentParams: Record<string, unknown>): string {
  const pending: PendingAction = { action, params: currentParams, awaitingParam: param }
  const prompts: Record<string, Record<string, string>> = {
    create_event_type: {
      title: "What would you like to call this event type?",
      duration: "How long should it be? (e.g., 30 minutes, 1 hour)",
    },
    create_team: { name: "What should the team be called?" },
    create_api_key: { name: "What name/label for this API key?" },
    create_webhook: { url: "What URL should the webhook send to?" },
    set_custom_domain: { domain: "What domain would you like to use? (e.g., meet.example.com)" },
    add_date_override: { date: "Which date? (e.g., 2026-02-15 or 'tomorrow')" },
  }

  const prompt = prompts[action]?.[param] || `What ${param} would you like?`
  return `${prompt}\n${formatPendingMetadata(pending)}`
}
