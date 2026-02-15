import { NextRequest, NextResponse } from "next/server"
import { authenticateApiKey } from "@/lib/api-auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  const user = await authenticateApiKey(req)
  if (user instanceof NextResponse) return user

  const eventTypes = await prisma.eventType.findMany({
    where: { userId: user.id, isActive: true },
    select: {
      id: true, title: true, slug: true, description: true, duration: true,
      color: true, locationType: true, isActive: true, maxAttendees: true,
      bufferBefore: true, bufferAfter: true, minNotice: true, maxDaysAhead: true,
      price: true, currency: true, visibility: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ eventTypes })
}
