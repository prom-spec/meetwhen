import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger as logger } from "@/lib/logger"

// Calendly API v2 base
const CALENDLY_API = "https://api.calendly.com"

interface CalendlyEventType {
  uri: string
  name: string
  slug: string
  active: boolean
  description_plain?: string
  description_html?: string
  duration: number
  color: string
  kind: string // "solo" | "group"
  pooling_type?: string
  type: string // "StandardEventType" | "AdhocEventType"
  secret: boolean
  scheduling_url: string
  custom_questions?: Array<{
    name: string
    type: string // "string" | "text" | "phone_number" | "single_select" | "multi_select" | "radio_buttons"
    position: number
    enabled: boolean
    required: boolean
    answer_choices?: string[]
  }>
  profile?: {
    name: string
    owner: string
    type: string
  }
  location?: {
    kind: string
    location?: string
    additional_info?: string
  }
}

interface CalendlyResponse {
  collection: CalendlyEventType[]
  pagination: {
    count: number
    next_page?: string
    next_page_token?: string
  }
}

function mapLocationType(calendlyKind?: string): string {
  if (!calendlyKind) return "GOOGLE_MEET"
  const map: Record<string, string> = {
    physical: "IN_PERSON",
    outbound_call: "PHONE",
    inbound_call: "PHONE",
    google_conference: "GOOGLE_MEET",
    zoom_conference: "ZOOM",
    microsoft_teams_conference: "MS_TEAMS",
    webex_conference: "CUSTOM",
    gotomeeting_conference: "CUSTOM",
    custom: "CUSTOM",
  }
  return map[calendlyKind] || "GOOGLE_MEET"
}

function mapQuestionType(calendlyType: string): "text" | "select" | "checkbox" {
  if (calendlyType === "single_select" || calendlyType === "radio_buttons") return "select"
  if (calendlyType === "multi_select") return "checkbox"
  return "text"
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50) || "imported-event"
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { apiKey, selectedEventTypes } = await req.json()

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Calendly API key is required" }, { status: 400 })
    }

    // Step 1: Get current user from Calendly
    const meResp = await fetch(`${CALENDLY_API}/users/me`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!meResp.ok) {
      const errText = await meResp.text()
      logger.error("Calendly API auth failed", { status: meResp.status, body: errText })
      return NextResponse.json(
        { error: meResp.status === 401 ? "Invalid Calendly API key" : "Failed to connect to Calendly" },
        { status: meResp.status === 401 ? 401 : 502 }
      )
    }

    const meData = await meResp.json()
    const userUri = meData.resource?.uri

    if (!userUri) {
      return NextResponse.json({ error: "Could not get Calendly user info" }, { status: 502 })
    }

    // Step 2: Fetch all event types
    let allEventTypes: CalendlyEventType[] = []
    let nextPage: string | null = `${CALENDLY_API}/event_types?user=${encodeURIComponent(userUri)}&count=100`

    while (nextPage) {
      const resp = await fetch(nextPage, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!resp.ok) {
        logger.error("Calendly event types fetch failed", { status: resp.status })
        return NextResponse.json({ error: "Failed to fetch Calendly event types" }, { status: 502 })
      }

      const data: CalendlyResponse = await resp.json()
      allEventTypes = [...allEventTypes, ...data.collection]
      nextPage = data.pagination.next_page || null
    }

    // If no selectedEventTypes provided, return the list for user to pick
    if (!selectedEventTypes) {
      return NextResponse.json({
        eventTypes: allEventTypes.map((et) => ({
          uri: et.uri,
          name: et.name,
          slug: et.slug,
          duration: et.duration,
          active: et.active,
          kind: et.kind,
          secret: et.secret,
          description: et.description_plain,
          color: et.color,
          location: et.location?.kind,
          questionsCount: et.custom_questions?.filter((q) => q.enabled).length || 0,
        })),
        calendlyName: meData.resource?.name,
        calendlyEmail: meData.resource?.email,
      })
    }

    // Step 3: Import selected event types
    const toImport = allEventTypes.filter((et) =>
      selectedEventTypes.includes(et.uri)
    )

    if (toImport.length === 0) {
      return NextResponse.json({ error: "No event types selected" }, { status: 400 })
    }

    // Get existing slugs to avoid conflicts
    const existingSlugs = await prisma.eventType.findMany({
      where: { userId: session.user.id },
      select: { slug: true },
    })
    const slugSet = new Set(existingSlugs.map((e) => e.slug))

    const imported = []
    const errors = []

    for (const et of toImport) {
      try {
        let slug = generateSlug(et.name)
        let suffix = 1
        while (slugSet.has(slug)) {
          slug = `${generateSlug(et.name)}-${suffix}`
          suffix++
        }
        slugSet.add(slug)

        // Map custom questions
        const questions = et.custom_questions
          ?.filter((q) => q.enabled)
          .map((q) => ({
            id: `q_${q.position}`,
            label: q.name,
            type: mapQuestionType(q.type),
            required: q.required,
            ...(q.answer_choices?.length ? { options: q.answer_choices } : {}),
          }))

        const created = await prisma.eventType.create({
          data: {
            userId: session.user.id,
            title: et.name,
            slug,
            description: et.description_plain || null,
            duration: et.duration,
            color: et.color || "#3B82F6",
            locationType: mapLocationType(et.location?.kind) as any,
            locationValue: et.location?.location || null,
            isActive: et.active,
            visibility: et.secret ? "unlisted" : "public",
            maxAttendees: et.kind === "group" ? 10 : 1,
            screeningQuestions: questions?.length ? JSON.stringify(questions) : null,
          },
        })

        imported.push({ name: et.name, slug: created.slug, id: created.id })
      } catch (err: any) {
        logger.error("Failed to import event type", { name: et.name, error: err.message })
        errors.push({ name: et.name, error: err.message })
      }
    }

    return NextResponse.json({
      imported,
      errors,
      total: toImport.length,
      successCount: imported.length,
      errorCount: errors.length,
    })
  } catch (err: any) {
    logger.error("Calendly import error", { error: err.message })
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}
