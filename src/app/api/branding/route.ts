import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      email: true,
      brandColor: true,
      accentColor: true,
      brandLogo: true,
      hidePoweredBy: true,
      removeBranding: true,
      plan: true,
      gaTrackingId: true,
      metaPixelId: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Check for org branding enforcement
  const emailDomain = user.email.split("@")[1]
  let orgBrandFooter: string | null = null
  let orgManaged = false

  if (emailDomain) {
    const domainClaim = await prisma.domainClaim.findUnique({
      where: { domain: emailDomain },
      include: { orgBranding: true },
    })

    if (domainClaim?.verifiedAt && domainClaim.orgBranding?.enforced) {
      orgManaged = true
      const ob = domainClaim.orgBranding
      orgBrandFooter = ob.footerText || null

      return NextResponse.json({
        brandColor: ob.primaryColor || user.brandColor,
        accentColor: ob.accentColor || user.accentColor,
        brandLogo: ob.logoUrl || user.brandLogo,
        hidePoweredBy: (user.plan !== "free" && user.removeBranding) || user.hidePoweredBy,
        gaTrackingId: user.gaTrackingId,
        metaPixelId: user.metaPixelId,
        orgBrandFooter,
        orgManaged,
      })
    }
  }

  return NextResponse.json({
    brandColor: user.brandColor,
    accentColor: user.accentColor,
    brandLogo: user.brandLogo,
    hidePoweredBy: (user.plan !== "free" && user.removeBranding) || user.hidePoweredBy,
    gaTrackingId: user.gaTrackingId,
    metaPixelId: user.metaPixelId,
    orgBrandFooter: null,
    orgManaged: false,
  })
}
