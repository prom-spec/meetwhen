import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const SYSTEM_PROMPT = `You are letsmeet.link's friendly scheduling assistant. Help users manage their meetings and calendar.

TONE: Warm, simple, conversational. Write like you're helping a friend, not a developer. No jargon.

WHAT YOU HELP WITH:
- Setting up meeting types (like "30-min call" or "Coffee chat")
- Checking upcoming meetings
- Managing when you're available
- Blocking off dates

OFF-TOPIC: Politely say "I'm here to help with your letsmeet.link scheduling! For that, you might want to check [topic]."

NAVIGATION - Always include helpful links:
- [Dashboard](/dashboard) - Your home base
- [Event Types](/dashboard/event-types) - Create/edit meeting types
- [Create New Event](/dashboard/event-types/new) - Set up a new meeting type
- [Availability](/dashboard/availability) - Set your working hours
- [Bookings](/dashboard/bookings) - See your scheduled meetings
- [Settings](/dashboard/settings) - Update your profile

STYLE RULES:
- Use "you" and "your" (not "the user")
- Say "meetings" not "bookings" or "events"
- Keep answers short and friendly
- Include a relevant link when helpful
- Use emoji sparingly for warmth 📅

Example good response: "You have 3 meetings coming up this week! Check them all in [your bookings](/dashboard/bookings). Need to block some time off?"`

// Rate limiting: 10 messages per user per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const hourInMs = 60 * 60 * 1000
  const limit = rateLimitMap.get(userId)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + hourInMs })
    return { allowed: true, remaining: 9, resetAt: now + hourInMs }
  }

  if (limit.count >= 10) {
    return { allowed: false, remaining: 0, resetAt: limit.resetAt }
  }

  limit.count++
  return { allowed: true, remaining: 10 - limit.count, resetAt: limit.resetAt }
}

// Function handlers
async function executeFunction(name: string, args: Record<string, unknown>, userId: string) {
  switch (name) {
    case "get_event_types": {
      const eventTypes = await prisma.eventType.findMany({
        where: { userId },
        select: { id: true, title: true, slug: true, duration: true, isActive: true },
      })
      return { eventTypes }
    }

    case "get_bookings": {
      const bookings = await prisma.booking.findMany({
        where: { hostId: userId, status: { not: "CANCELLED" }, startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: 10,
        include: { eventType: { select: { title: true } } },
      })
      return {
        bookings: bookings.map((b) => ({
          id: b.id,
          eventType: b.eventType.title,
          guestName: b.guestName,
          startTime: b.startTime.toISOString(),
          status: b.status,
        })),
      }
    }

    case "toggle_availability": {
      const { dayOfWeek, enabled, startTime = "09:00", endTime = "17:00" } = args as {
        dayOfWeek: number
        enabled: boolean
        startTime?: string
        endTime?: string
      }
      if (!enabled) {
        await prisma.availability.deleteMany({ where: { userId, dayOfWeek } })
        return { success: true, message: `Disabled availability for day ${dayOfWeek}` }
      }
      await prisma.availability.deleteMany({ where: { userId, dayOfWeek } })
      await prisma.availability.create({
        data: { userId, dayOfWeek, startTime, endTime },
      })
      return { success: true, message: `Set availability for day ${dayOfWeek}: ${startTime}-${endTime}` }
    }

    case "add_date_override": {
      const { date, isAvailable, startTime, endTime } = args as {
        date: string
        isAvailable: boolean
        startTime?: string
        endTime?: string
      }
      const dateObj = new Date(date)
      await prisma.dateOverride.upsert({
        where: { userId_date: { userId, date: dateObj } },
        update: { isAvailable, startTime: startTime || null, endTime: endTime || null },
        create: { userId, date: dateObj, isAvailable, startTime: startTime || null, endTime: endTime || null },
      })
      return { success: true, message: isAvailable ? `Set custom hours for ${date}` : `Blocked ${date}` }
    }

    default:
      return { error: `Unknown function: ${name}` }
  }
}

// Function definitions for Cloudflare AI
const functions = [
  {
    name: "get_event_types",
    description: "List all event types configured by the user",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_bookings",
    description: "Get upcoming bookings",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "toggle_availability",
    description: "Enable or disable availability for a day of the week",
    parameters: {
      type: "object",
      properties: {
        dayOfWeek: { type: "number", description: "Day of week (0=Sunday..6=Saturday)" },
        enabled: { type: "boolean", description: "Whether to enable availability" },
        startTime: { type: "string", description: "Start time (HH:mm)" },
        endTime: { type: "string", description: "End time (HH:mm)" },
      },
      required: ["dayOfWeek", "enabled"],
    },
  },
  {
    name: "add_date_override",
    description: "Block a specific date or set custom hours",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date (YYYY-MM-DD)" },
        isAvailable: { type: "boolean", description: "Whether available on this date" },
        startTime: { type: "string", description: "Custom start time" },
        endTime: { type: "string", description: "Custom end time" },
      },
      required: ["date", "isAvailable"],
    },
  },
]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Check rate limit
    const rateLimit = checkRateLimit(userId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Max 10 messages per hour.",
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        { status: 429 }
      )
    }

    const { messages } = await request.json()

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const aiToken = process.env.CLOUDFLARE_AI_TOKEN

    if (!accountId || !aiToken) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    // Prepare messages with system prompt
    const allMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages]

    // Call Cloudflare Workers AI
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: allMessages,
          tools: functions.map((f) => ({
            type: "function",
            function: { name: f.name, description: f.description, parameters: f.parameters },
          })),
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error("Cloudflare AI error:", data)
      return NextResponse.json({ error: "AI service error" }, { status: 500 })
    }

    const result = data.result

    // Handle function calls
    if (result.tool_calls && result.tool_calls.length > 0) {
      const toolCall = result.tool_calls[0]
      const functionName = toolCall.function.name
      const functionArgs = JSON.parse(toolCall.function.arguments || "{}")

      // Execute the function
      const functionResult = await executeFunction(functionName, functionArgs, userId)

      // Make another call with the function result
      const followUpMessages = [
        ...allMessages,
        { role: "assistant", content: null, tool_calls: [toolCall] },
        { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(functionResult) },
      ]

      const followUpResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${aiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: followUpMessages }),
        }
      )

      const followUpData = await followUpResponse.json()
      return NextResponse.json({
        response: followUpData.result?.response || "Action completed.",
        functionResult,
        remainingMessages: rateLimit.remaining,
      })
    }

    return NextResponse.json({
      response: result.response,
      remainingMessages: rateLimit.remaining,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
