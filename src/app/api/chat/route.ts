import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getFunctionDefinitions, executeAction } from "@/lib/chat-actions"

const SYSTEM_PROMPT = `You are letsmeet.link's AI Scheduler — a smart scheduling assistant that can take REAL actions. You help users manage meetings, availability, workflows, and teams through natural conversation.

TONE: Warm, concise, conversational. No jargon. Use emoji sparingly 📅

CAPABILITIES — You can execute these actions via function calls:
• Event Types: create, list, update, delete, toggle active/inactive
• Availability: set weekly schedule, view current schedule, add date overrides (block days, custom hours)
• Bookings: list upcoming/past, cancel (with confirmation)
• Settings: view/update profile, timezone, branding, holiday blocking
• Workflows: create, list, toggle — triggers: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED, BEFORE_MEETING, AFTER_MEETING
• Teams: list, create
• Analytics: get booking stats summary
• Polls: create, list, delete, close voting, get results
• Routing Forms: list, create, delete
• Embed: generate embed code (inline/popup/floating) for event types
• Custom Domain: view, set, verify DNS
• Holidays: view/set holiday blocking and country
• Branding: view/update brand color, logo, powered-by badge
• Linked Accounts: list OAuth accounts, view calendar sync status
• API Keys: list, create, revoke
• Webhooks: list, create, delete, test delivery
• Recurring Meetings: list series, cancel entire series
• Group Events: view attendees per slot
• Custom Questions: view/set custom booking questions per event type

WORKFLOW:
1. When user requests an action, use the appropriate function call
2. For destructive actions (delete, cancel), ask for confirmation first by calling the function with confirmed=false, then with confirmed=true when user confirms
3. When creating event types, if user doesn't specify all details, use sensible defaults (30 min, Google Meet, etc.) — don't ask for every field
4. Show results clearly with links to relevant dashboard pages

NAVIGATION LINKS (include when relevant):
- [Dashboard](/dashboard)
- [Event Types](/dashboard/event-types)
- [Availability](/dashboard/availability)
- [Bookings](/dashboard/bookings)
- [Workflows](/dashboard/workflows)
- [Settings](/dashboard/settings)
- [Teams](/dashboard/teams)
- [Analytics](/dashboard/analytics)
- [Polls](/dashboard/polls)
- [Routing Forms](/dashboard/routing)
- [Webhooks](/dashboard/webhooks)
- [API Keys](/dashboard/api-keys)

OFF-TOPIC: Politely redirect — "I'm here to help with your scheduling!"

STYLE: Keep answers short. Use bullet points for lists. Include links when helpful.`

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

async function callAI(
  accountId: string,
  aiToken: string,
  messages: Array<{ role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string }>,
  tools?: unknown[]
) {
  const body: Record<string, unknown> = { messages }
  if (tools && tools.length > 0) body.tools = tools

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  const data = await response.json()
  if (!response.ok) {
    console.error("Cloudflare AI error:", JSON.stringify(data))
    throw new Error("AI service error")
  }
  return data.result
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

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const aiToken = process.env.CLOUDFLARE_AI_TOKEN

    if (!accountId || !aiToken) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    const tools = getFunctionDefinitions()
    const allMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...sanitizedMessages]

    let result = await callAI(accountId, aiToken, allMessages, tools)

    // Handle up to 3 sequential tool calls (for multi-step conversations)
    let actionResults: Array<{ action: string; result: unknown }> = []
    let iterations = 0

    while (result.tool_calls && result.tool_calls.length > 0 && iterations < 3) {
      iterations++
      const toolCall = result.tool_calls[0]
      const functionName = toolCall.function?.name || toolCall.name
      let functionArgs: Record<string, unknown> = {}

      try {
        const rawArgs = toolCall.function?.arguments || toolCall.arguments || "{}"
        functionArgs = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs
      } catch {
        functionArgs = {}
      }

      const actionResult = await executeAction(functionName, functionArgs, userId)
      actionResults.push({ action: functionName, result: actionResult })

      // Build follow-up messages with tool result
      const followUpMessages = [
        ...allMessages,
        {
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        },
        {
          role: "tool",
          tool_call_id: toolCall.id || `call_${iterations}`,
          content: JSON.stringify(actionResult),
        },
      ]

      result = await callAI(accountId, aiToken, followUpMessages)
    }

    const responseText =
      result.response ||
      (actionResults.length > 0 ? actionResults[actionResults.length - 1].result : "I couldn't process that. Try again?")

    // If AI didn't produce a text response but we have action results, summarize
    let finalResponse: string
    if (typeof responseText === "string") {
      finalResponse = responseText
    } else {
      const lastAction = actionResults[actionResults.length - 1]
      const r = lastAction?.result as { message?: string } | undefined
      finalResponse = r?.message || "Done!"
    }

    return NextResponse.json({
      response: finalResponse,
      actions: actionResults.length > 0 ? actionResults : undefined,
      remainingMessages: rateLimit.remaining,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
