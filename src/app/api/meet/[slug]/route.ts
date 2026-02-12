import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const link = await prisma.oneOffLink.findUnique({
    where: { slug },
    include: {
      bookings: { select: { slotTime: true } },
      user: { select: { name: true, image: true } },
    },
  })

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Check if expired
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 })
  }

  if (link.usedCount >= link.maxUses) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 })
  }

  return NextResponse.json(link)
}
