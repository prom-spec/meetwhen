import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { executeAction } from "@/lib/chat-actions"
import {
  parseIntent,
  handleMultiTurn,
  getMissingParams,
  formatActionResult,
  formatMissingParamPrompt,
} from "@/lib/chat-intent"

const QA_SYSTEM_PROMPT = `You are letsmeet.link's AI Scheduler — a friendly scheduling assistant.
You help users understand the platform's features. Keep answers SHORT (1-2 sentences max).
Use emoji sparingly 📅. NEVER explain steps or how-to instructions. If the user wants to take an action, just say "Sure, tell me what to create/change and I'll do it right away."

Features: event types (with per-event time range limits, screening questions, group events, recurring bookings), availability scheduling, bookings, workflows, email sequence outreach, teams (with round-robin & collective scheduling), polls, routing forms, webhooks, API keys, custom domains, embed widgets (inline/popup/floating with custom colors), analytics (with GA & Meta Pixel tracking), holiday blocking, branding, cancellation policies, confirmation redirects, SSO/SAML for teams, SCIM provisioning, audit logs, book-for-others, data deletion API, PWA (installable app), Chrome extension, MCP integration for AI agents.

Pricing: Free ($0, powered-by badge), Pro ($1/mo, remove badge + priority support), Enterprise ($5/seat/mo, SSO + SCIM + audit logs + admin-managed events). 100% early adopter discount — everything free right now.

Dashboard links:
- [Event Types](/dashboard/event-types)
- [Availability](/dashboard/availability)
- [Bookings](/dashboard/bookings)
- [Workflows](/dashboard/workflows)
- [Analytics](/dashboard/analytics)
- [Settings](/dashboard/settings)
- [Audit Log](/dashboard/settings/audit-log)

Off-topic: Politely redirect — "I'm here to help with your scheduling!"`

const QA_MODEL = "@cf/meta/llama-3.1-8b-instruct"

// Rate limiting: 30 messages per user per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const hourInMs = 60 * 60 * 1000
  const limit = rateLimitMap.get(userId)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + hourInMs })
    return { allowed: true, remaining: 29, resetAt: now + hourInMs }
  }

  if (limit.count >= 30) {
    return { allowed: false, remaining: 0, resetAt: limit.resetAt }
  }

  limit.count++
  return { allowed: true, remaining: 30 - limit.count, resetAt: limit.resetAt }
}

async function callQA(
  accountId: string,
  aiToken: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${QA_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    }
  )

  const data = await response.json()
  if (!response.ok) {
    console.error("Cloudflare AI error:", JSON.stringify(data))
    throw new Error("AI service error")
  }
  return data.result?.response || "I'm not sure how to answer that. Could you rephrase?"
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const rateLimit = checkRateLimit(userId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 30 messages per hour.", resetAt: new Date(rateLimit.resetAt).toISOString() },
        { status: 429 }
      )
    }

    const body = await request.json()
    const messages = body?.messages
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return NextResponse.json({ error: "Invalid messages: must be 1-50 messages" }, { status: 400 })
    }

    const sanitizedMessages = messages
      .filter((m: { role?: string }) => m.role === "user" || m.role === "assistant")
      .map((m: { role: string; content: unknown }) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content.slice(0, 4000) : "",
      }))

    if (sanitizedMessages.length === 0) {
      return NextResponse.json({ error: "No valid messages" }, { status: 400 })
    }

    const lastUserMessage = sanitizedMessages.filter((m: { role: string }) => m.role === "user").pop()?.content || ""

    // Step 1: Check multi-turn context (confirmations, missing params)
    let intent = handleMultiTurn(lastUserMessage, sanitizedMessages)

    // Step 2: If no multi-turn match, parse fresh intent
    if (!intent) {
      intent = parseIntent(lastUserMessage)
    }

    console.log(`[Chat] Intent: ${JSON.stringify(intent)}, message="${lastUserMessage.slice(0, 80)}"`)

    // Step 3: No action detected → Q&A mode (LLM, no tools)
    if (!intent.action) {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
      const aiToken = process.env.CLOUDFLARE_AI_TOKEN

      if (!accountId || !aiToken) {
        return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
      }

      // Strip pending metadata from messages before sending to LLM
      const cleanMessages = sanitizedMessages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content.replace(/<!-- PENDING:.*? -->/g, "").trim(),
      }))

      const qaMessages = [{ role: "system", content: QA_SYSTEM_PROMPT }, ...cleanMessages]
      const response = await callQA(accountId, aiToken, qaMessages)

      return NextResponse.json({
        response,
        remainingMessages: rateLimit.remaining,
      })
    }

    // Step 4: Action detected — check for missing required params
    const missingParam = getMissingParams(intent.action, intent.params)
    if (missingParam) {
      const prompt = formatMissingParamPrompt(intent.action, missingParam, intent.params)
      return NextResponse.json({
        response: prompt,
        remainingMessages: rateLimit.remaining,
      })
    }

    // Step 5: Execute the action
    console.log(`[Chat] Executing ${intent.action} with params:`, JSON.stringify(intent.params))
    const result = await executeAction(intent.action, intent.params, userId)
    console.log(`[Chat] Result:`, JSON.stringify(result))

    // Step 6: Format and return
    const response = formatActionResult(intent.action, result)

    return NextResponse.json({
      response,
      actions: [{ action: intent.action, result }],
      remainingMessages: rateLimit.remaining,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
