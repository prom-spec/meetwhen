// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { z } from "zod"
import { apiLogger } from "@/lib/logger"

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  username: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/i, "Username can only contain letters, numbers, underscores, and hyphens").optional(),
  timezone: z.string().min(1).max(100).optional(),
  calendarSyncEnabled: z.boolean().optional(),
  blockHolidays: z.boolean().optional(),
  holidayCountry: z.string().max(2).optional(),
  brandColor: z.string().max(7).regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").nullable().optional(),
  accentColor: z.string().max(7).regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").nullable().optional(),
  brandLogo: z.preprocess((v) => (v === "" ? null : v), z.string().url().max(2048).nullable().optional()),
  hidePoweredBy: z.boolean().optional(),
  removeBranding: z.boolean().optional(),
  gaTrackingId: z.string().max(50).nullable().optional(),
  metaPixelId: z.string().max(50).nullable().optional(),
  primaryAccountId: z.string().max(200).nullable().optional(),
}).strict()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        timezone: true,
        calendarSyncEnabled: true,
        blockHolidays: true,
        holidayCountry: true,
        brandColor: true,
        accentColor: true,
        brandLogo: true,
        hidePoweredBy: true,
        removeBranding: true,
        gaTrackingId: true,
        metaPixelId: true,
        plan: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if Google account is connected
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google",
      },
      select: {
        id: true,
        scope: true,
      },
    })

    const hasCalendarScope = googleAccount?.scope?.includes("calendar") ?? false

    return NextResponse.json({
      ...user,
      googleConnected: !!googleAccount,
      hasCalendarScope,
    })
  } catch (error) {
    apiLogger.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateSettingsSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstField = Object.keys(fieldErrors)[0]
      const firstMsg = firstField ? `${firstField}: ${fieldErrors[firstField]?.[0]}` : "Invalid input"
      return NextResponse.json({ error: firstMsg, details: fieldErrors }, { status: 400 })
    }
    const { name, username, timezone, calendarSyncEnabled, blockHolidays, holidayCountry, brandColor, accentColor, brandLogo, hidePoweredBy, gaTrackingId, metaPixelId, primaryAccountId } = parsed.data

    // Validate username uniqueness if provided
    if (username !== undefined) {
      
      // Check uniqueness
      const existing = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: session.user.id },
        },
      })
      
      if (existing) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    
    if (name !== undefined) updateData.name = name
    if (username !== undefined) updateData.username = username
    if (timezone !== undefined) updateData.timezone = timezone
    if (calendarSyncEnabled !== undefined) updateData.calendarSyncEnabled = calendarSyncEnabled
    if (blockHolidays !== undefined) updateData.blockHolidays = blockHolidays
    if (holidayCountry !== undefined) updateData.holidayCountry = holidayCountry
    if (brandColor !== undefined) updateData.brandColor = brandColor
    if (accentColor !== undefined) updateData.accentColor = accentColor
    if (brandLogo !== undefined) updateData.brandLogo = brandLogo
    // Plan-gate branding removal: only Pro+ users can remove branding
    if (hidePoweredBy !== undefined || parsed.data.removeBranding !== undefined) {
      const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } })
      if (currentUser?.plan === "free") {
        return NextResponse.json({ error: "Upgrade to Pro to remove branding" }, { status: 403 })
      }
      if (hidePoweredBy !== undefined) updateData.hidePoweredBy = hidePoweredBy
      if (parsed.data.removeBranding !== undefined) updateData.removeBranding = parsed.data.removeBranding
    }
    if (gaTrackingId !== undefined) updateData.gaTrackingId = gaTrackingId
    if (metaPixelId !== undefined) updateData.metaPixelId = metaPixelId
    if (primaryAccountId !== undefined) updateData.primaryAccountId = primaryAccountId

    logAudit(session.user.id, "settings.updated", "settings", session.user.id, { changes: Object.keys(updateData) })

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        timezone: true,
        calendarSyncEnabled: true,
        blockHolidays: true,
        holidayCountry: true,
        brandColor: true,
        accentColor: true,
        brandLogo: true,
        hidePoweredBy: true,
        removeBranding: true,
        gaTrackingId: true,
        metaPixelId: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    apiLogger.error("Error updating settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
