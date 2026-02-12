// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import crypto from "crypto"

interface RouteParams { params: Promise<{ id: string }> }

// POST - Generate a personalized availability share link for a contact
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const contact = await prisma.contactProfile.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 })

  const token = crypto.randomBytes(16).toString("base64url")

  const share = await prisma.availabilityShare.create({
    data: {
      userId: session.user.id,
      contactId: contact.id,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  })

  const url = `${process.env.NEXTAUTH_URL || "https://letsmeet.link"}/schedule/${share.token}`

  return NextResponse.json({ share, url }, { status: 201 })
}
