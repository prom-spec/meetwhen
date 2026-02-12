import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { logValidationError, logError } from "@/lib/error-log"
import { z } from "zod"

// Transform empty strings to null/undefined for optional fields
const optionalNullableInt = (min: number, max?: number) => {
  let schema = z.coerce.number().int().min(min)
  if (max !== undefined) schema = schema.max(max)
  return z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), schema.optional())
}
const optionalNullableUrl = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.string().url().max(2000).optional()
)

const updateEventTypeSchema = z.object({
  title: z.string().min(1, "Event Name is required").max(200).trim().optional(),
  slug: z.string().min(1, "URL Slug is required").max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only").optional(),
  description: z.preprocess((v) => (v === "" ? null : v), z.string().max(2000).nullable().optional()),
  duration: optionalNullableInt(5, 480),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  location: z.preprocess((v) => (v === "" ? null : v), z.string().max(500).nullable().optional()),
  locationType: z.enum(["IN_PERSON", "GOOGLE_MEET", "ZOOM", "PHONE", "CUSTOM"]).optional().nullable(),
  locationValue: z.preprocess((v) => (v === "" ? null : v), z.string().max(500).nullable().optional()),
  isActive: z.boolean().optional(),
  bufferBefore: optionalNullableInt(0, 120),
  bufferAfter: optionalNullableInt(0, 120),
  minNotice: optionalNullableInt(0, 43200),
  maxDaysAhead: optionalNullableInt(1, 365),
  allowRecurring: z.preprocess((v) => (v === "" ? undefined : v), z.boolean().optional()),
  recurrenceOptions: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
  maxBookingsPerDay: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1).optional()),
  maxBookingsPerWeek: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1).optional()),
  redirectUrl: optionalNullableUrl,
  visibility: z.enum(["public", "unlisted"]).optional(),
  maxAttendees: optionalNullableInt(1, 100),
  customQuestions: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
  screeningQuestions: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
  price: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(0).optional()),
  currency: z.preprocess((v) => (v === "" ? undefined : v), z.string().length(3).optional()),
  cancellationPolicy: z.preprocess((v) => (v === "" ? null : v), z.string().max(2000).nullable().optional()),
  confirmationLinks: z.preprocess((v) => (v === "" ? null : v), z.string().max(5000).nullable().optional()),
  availableStartTime: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\d{2}:\d{2}$/).nullable().optional()),
  availableEndTime: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\d{2}:\d{2}$/).nullable().optional()),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const eventType = await prisma.eventType.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!eventType) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    return NextResponse.json(eventType)
  } catch (error) {
    console.error("Error fetching event type:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingEventType = await prisma.eventType.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { assignedToId: session.user.id },
        ],
      },
    })

    if (!existingEventType) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    // Block edits if admin-managed and user is not the creator/admin
    if (existingEventType.isAdminManaged && existingEventType.userId !== session.user.id) {
      return NextResponse.json({ error: "This event type is managed by an admin and cannot be edited" }, { status: 403 })
    }

    const rawBody = await request.json()
    const parsed = updateEventTypeSchema.safeParse(rawBody)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstField = Object.keys(fieldErrors)[0]
      const firstMsg = firstField ? `${firstField}: ${fieldErrors[firstField]?.[0]}` : "Invalid input"
      logValidationError("api/event-types/update", fieldErrors, session.user.id, `/api/event-types/${id}`)
      return NextResponse.json({ error: firstMsg, details: fieldErrors }, { status: 400 })
    }
    const { title, slug, description, duration, color, location, locationType, locationValue, isActive, bufferBefore, bufferAfter, minNotice, maxDaysAhead, allowRecurring, recurrenceOptions, maxBookingsPerDay, maxBookingsPerWeek, redirectUrl, visibility, maxAttendees, customQuestions, screeningQuestions, price, currency } = parsed.data

    if (slug && slug !== existingEventType.slug) {
      const slugExists = await prisma.eventType.findFirst({
        where: {
          userId: session.user.id,
          slug,
          id: { not: id },
        },
      })

      if (slugExists) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 })
      }
    }

    // Build update data, only including fields that were provided
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (duration !== undefined) updateData.duration = duration
    if (color !== undefined) updateData.color = color
    if (location !== undefined) updateData.location = location
    if (locationType !== undefined) updateData.locationType = locationType
    if (locationValue !== undefined) updateData.locationValue = locationValue
    if (isActive !== undefined) updateData.isActive = isActive
    if (bufferBefore !== undefined) updateData.bufferBefore = bufferBefore
    if (bufferAfter !== undefined) updateData.bufferAfter = bufferAfter
    if (minNotice !== undefined) updateData.minNotice = minNotice
    if (maxDaysAhead !== undefined) updateData.maxDaysAhead = maxDaysAhead
    if (allowRecurring !== undefined) updateData.allowRecurring = allowRecurring
    if (recurrenceOptions !== undefined) updateData.recurrenceOptions = recurrenceOptions
    if (maxBookingsPerDay !== undefined) updateData.maxBookingsPerDay = maxBookingsPerDay
    if (maxBookingsPerWeek !== undefined) updateData.maxBookingsPerWeek = maxBookingsPerWeek
    if (redirectUrl !== undefined) updateData.redirectUrl = redirectUrl
    if (visibility !== undefined) updateData.visibility = visibility
    if (maxAttendees !== undefined) updateData.maxAttendees = maxAttendees
    if (customQuestions !== undefined) updateData.customQuestions = customQuestions
    if (screeningQuestions !== undefined) updateData.screeningQuestions = screeningQuestions
    if (price !== undefined) updateData.price = price
    if (currency !== undefined) updateData.currency = currency
    if (rawBody.cancellationPolicy !== undefined) updateData.cancellationPolicy = parsed.data.cancellationPolicy ?? null
    if (rawBody.confirmationLinks !== undefined) updateData.confirmationLinks = parsed.data.confirmationLinks ?? null
    if (rawBody.availableStartTime !== undefined) updateData.availableStartTime = parsed.data.availableStartTime ?? null
    if (rawBody.availableEndTime !== undefined) updateData.availableEndTime = parsed.data.availableEndTime ?? null

    const eventType = await prisma.eventType.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updateData as any,
    })

    logAudit(session.user.id, "event_type.updated", "event_type", id, { changes: Object.keys(updateData) })

    return NextResponse.json(eventType)
  } catch (error) {
    console.error("Error updating event type:", error)
    logError({ source: "api/event-types/update", message: error instanceof Error ? error.message : "Unknown error", statusCode: 500, requestPath: `/api/event-types/${id}` })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const eventType = await prisma.eventType.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!eventType) {
      return NextResponse.json({ error: "Event type not found" }, { status: 404 })
    }

    await prisma.eventType.delete({
      where: { id },
    })

    logAudit(session.user.id, "event_type.deleted", "event_type", id, { title: eventType.title })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting event type:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
