// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const claims = await prisma.domainClaim.findMany({
    where: { userId: session.user.id, verifiedAt: { not: null } },
    include: { orgBranding: true },
  })

  return NextResponse.json({ claims })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { domainClaimId, logoUrl, primaryColor, accentColor, footerText, enforced } = body

  const claim = await prisma.domainClaim.findFirst({
    where: { id: domainClaimId, userId: session.user.id, verifiedAt: { not: null } },
  })
  if (!claim) return NextResponse.json({ error: "Verified domain claim not found" }, { status: 404 })

  const branding = await prisma.orgBranding.upsert({
    where: { domainClaimId },
    update: {
      ...(logoUrl !== undefined && { logoUrl }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(accentColor !== undefined && { accentColor }),
      ...(footerText !== undefined && { footerText }),
      ...(enforced !== undefined && { enforced }),
    },
    create: {
      domainClaimId,
      logoUrl: logoUrl || null,
      primaryColor: primaryColor || null,
      accentColor: accentColor || null,
      footerText: footerText || null,
      enforced: enforced || false,
    },
  })

  return NextResponse.json({ branding })
}
