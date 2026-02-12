import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

const createEventTypeSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(2000).optional(),
  duration: z.coerce.number().int().min(5).max(480),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  location: z.string().max(500).optional(),
  locationType: z.enum(["IN_PERSON", "GOOGLE_MEET", "ZOOM", "PHONE", "CUSTOM"]).optional(),
  locationValue: z.string().max(500).optional(),
  bufferBefore: z.coerce.number().int().min(0).max(120).optional(),
  bufferAfter: z.coerce.number().int().min(0).max(120).optional(),
  minNotice: z.coerce.number().int().min(0).max(43200).optional(),
  maxDaysAhead: z.coerce.number().int().min(1).max(365).optional(),
  teamId: z.string().optional(),
  schedulingType: z.enum(["INDIVIDUAL", "ROUND_ROBIN", "COLLECTIVE"]).optional(),
  allowRecurring: z.boolean().optional(),
  recurrenceOptions: z.string().nullable().optional(), // JSON array
  maxBookingsPerDay: z.coerce.number().int().min(1).nullable().optional(),
  maxBookingsPerWeek: z.coerce.number().int().min(1).nullable().optional(),
  redirectUrl: z.string().url().max(2000).nullable().optional(),
  visibility: z.enum(["public", "unlisted"]).optional(),
  maxAttendees: z.coerce.number().int().min(1).max(100).optional(),
  customQuestions: z.string().optional(),
  screeningQuestions: z.string().nullable().optional(),
  screeningQuestions: z.string().nullable().optional(),
  price: z.coerce.number().int().min(0).nullable().optional(),
  currency: z.string().length(3).optional(),
  cancellationPolicy: z.string().max(2000).nullable().optional(),
  confirmationLinks: z.string().max(5000).nullable().optional(),
  isAdminManaged: z.boolean().optional(),
  assignedToId: z.string().nullable().optional(),
  availableStartTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  availableEndTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      apiLogger.warn("Unauthorized access to event types")
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 })
    }

    const eventTypes = await prisma.eventType.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { assignedToId: session.user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(eventTypes)
  } catch (error) {
    apiLogger.error("Error fetching event types", error)
    return NextResponse.json({ error: "Unable to load event types. Please try again." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      apiLogger.warn("Unauthorized attempt to create event type")
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 })
    }
    
    apiLogger.info("Creating event type", { visitorId: session.user.id })

    const body = await request.json()
    const parsed = createEventTypeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const { 
      title, slug, description, duration, color, location, locationType, locationValue, 
      bufferBefore, bufferAfter, minNotice, maxDaysAhead,
      teamId, schedulingType, allowRecurring, recurrenceOptions,
      maxBookingsPerDay, maxBookingsPerWeek, redirectUrl, visibility, maxAttendees,
      customQuestions, screeningQuestions, price, currency, cancellationPolicy, confirmationLinks,
      isAdminManaged, assignedToId, availableStartTime, availableEndTime
    } = parsed.data

    // If teamId is provided, verify user is a team member with appropriate permissions
    if (teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.user.id } },
      })

      if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
        return NextResponse.json({ error: "Not authorized to create team event types" }, { status: 403 })
      }

      // Check for existing team slug
      const existingTeamSlug = await prisma.eventType.findFirst({
        where: { teamId, slug },
      })

      if (existingTeamSlug) {
        return NextResponse.json({ error: "Slug already exists for this team" }, { status: 400 })
      }
    } else {
      // Check for existing user slug
      const existingSlug = await prisma.eventType.findUnique({
        where: {
          userId_slug: {
            userId: session.user.id,
            slug,
          },
        },
      })

      if (existingSlug) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 })
      }
    }

    const eventType = await prisma.eventType.create({
      data: {
        userId: session.user.id,
        title,
        slug,
        description: description || null,
        duration: Number(duration),
        color: color || "#3B82F6",
        location: location || null,
        locationType: locationType || "GOOGLE_MEET",
        locationValue: locationValue || null,
        bufferBefore: bufferBefore ? Number(bufferBefore) : 0,
        bufferAfter: bufferAfter ? Number(bufferAfter) : 0,
        minNotice: minNotice ? Number(minNotice) : 240,
        maxDaysAhead: maxDaysAhead ? Number(maxDaysAhead) : 60,
        allowRecurring: allowRecurring || false,
        recurrenceOptions: recurrenceOptions || null,
        maxBookingsPerDay: maxBookingsPerDay || null,
        maxBookingsPerWeek: maxBookingsPerWeek || null,
        redirectUrl: redirectUrl || null,
        visibility: visibility || "public",
        maxAttendees: maxAttendees ? Number(maxAttendees) : 1,
        customQuestions: customQuestions || null,
        screeningQuestions: screeningQuestions || null,
        price: price || null,
        currency: currency || "USD",
        cancellationPolicy: cancellationPolicy || null,
        confirmationLinks: confirmationLinks || null,
        isAdminManaged: isAdminManaged || false,
        assignedToId: assignedToId || null,
        availableStartTime: availableStartTime || null,
        availableEndTime: availableEndTime || null,
        ...(teamId && { 
          teamId,
          schedulingType: schedulingType || "ROUND_ROBIN",
        }),
      },
    })

    logAudit(session.user.id, "event_type.created", "event_type", eventType.id, { title, slug })

    return NextResponse.json(eventType, { status: 201 })
  } catch (error) {
    apiLogger.error("Error creating event type", error)
    return NextResponse.json({ error: "Unable to create event type. Please try again." }, { status: 500 })
  }
}
