import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await req.json()
  const answers: Record<string, string> = body.answers || {}

  const form = await prisma.routingForm.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { order: "asc" } },
      rules: { orderBy: { order: "asc" } },
      user: { select: { username: true } },
    },
  })

  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Validate required fields
  for (const field of form.fields) {
    if (field.required && !answers[field.id]?.trim()) {
      return NextResponse.json({ error: `Field "${field.label}" is required` }, { status: 400 })
    }
  }

  // Evaluate rules in order, first match wins
  let matchedEventTypeId: string | null = null
  for (const rule of form.rules) {
    const answer = (answers[rule.fieldId] || "").trim().toLowerCase()
    const ruleValue = rule.value.trim().toLowerCase()

    let matches = false
    switch (rule.operator) {
      case "equals":
        matches = answer === ruleValue
        break
      case "contains":
        matches = answer.includes(ruleValue)
        break
      case "any":
        // "any" means any non-empty answer matches
        matches = answer.length > 0
        break
    }

    if (matches) {
      matchedEventTypeId = rule.eventTypeId
      break
    }
  }

  // Fallback
  if (!matchedEventTypeId) {
    matchedEventTypeId = form.fallbackEventTypeId || null
  }

  if (!matchedEventTypeId) {
    return NextResponse.json({ error: "No matching event type found" }, { status: 404 })
  }

  // Get event type to build redirect URL
  const eventType = await prisma.eventType.findUnique({
    where: { id: matchedEventTypeId },
    include: { user: { select: { username: true } }, team: { select: { slug: true } } },
  })

  if (!eventType) {
    return NextResponse.json({ error: "Event type not found" }, { status: 404 })
  }

  const basePath = eventType.team
    ? `/team/${eventType.team.slug}`
    : `/${eventType.user.username}`
  const redirectUrl = `${basePath}/${eventType.slug}`

  return NextResponse.json({ redirectUrl, eventTypeId: eventType.id })
}
