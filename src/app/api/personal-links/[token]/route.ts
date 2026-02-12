// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

interface RouteParams { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params

  const share = await prisma.availabilityShare.findUnique({
    where: { token },
    include: {
      contact: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          timezone: true,
          image: true,
          eventTypes: {
            where: { isActive: true, visibility: "public" },
            select: { id: true, title: true, slug: true, duration: true, color: true, description: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  })

  if (!share) return NextResponse.json({ error: "Link not found" }, { status: 404 })
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 })
  }

  return NextResponse.json({
    contactName: share.contact?.name || share.contact?.email || "Guest",
    contactEmail: share.contact?.email || null,
    host: share.user,
  })
}
