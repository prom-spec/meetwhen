// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { randomBytes } from "crypto"
import dns from "dns/promises"
import { apiLogger } from "@/lib/logger"

// GET - List domain claims + accounts on verified domains
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const claims = await prisma.domainClaim.findMany({
    where: { userId: session.user.id },
    include: { orgBranding: true },
    orderBy: { createdAt: "desc" },
  })

  // For verified domains, get accounts
  const verifiedDomains = claims.filter(c => c.verifiedAt)
  const domainAccounts: Record<string, any[]> = {}

  for (const claim of verifiedDomains) {
    const accounts = await prisma.user.findMany({
      where: { email: { endsWith: `@${claim.domain}` } },
      select: { id: true, email: true, name: true, image: true, createdAt: true, plan: true },
      orderBy: { createdAt: "desc" },
    })
    domainAccounts[claim.domain] = accounts
  }

  return NextResponse.json({ claims, domainAccounts })
}

// POST - Claim a domain or verify it
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Plan gating
  const { getPlanFromUser, canAccess } = await import("@/lib/plans")
  const planUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } })
  if (!canAccess(getPlanFromUser(planUser || {}), "customDomain")) {
    return NextResponse.json({ error: "Custom domains require a Pro plan. Upgrade at /dashboard/billing" }, { status: 403 })
  }

  const body = await req.json()
  const { action, domain } = body

  if (action === "claim") {
    if (!domain || typeof domain !== "string") return NextResponse.json({ error: "Domain required" }, { status: 400 })
    const cleanDomain = domain.toLowerCase().trim()

    // Check user's email matches domain
    const userEmail = session.user.email || ""
    if (!userEmail.endsWith(`@${cleanDomain}`)) {
      return NextResponse.json({ error: "Your email must be on this domain" }, { status: 400 })
    }

    // Check if already claimed
    const existing = await prisma.domainClaim.findUnique({ where: { domain: cleanDomain } })
    if (existing) return NextResponse.json({ error: "Domain already claimed" }, { status: 409 })

    const verificationToken = `letsmeet-verify=${randomBytes(16).toString("hex")}`

    const claim = await prisma.domainClaim.create({
      data: {
        domain: cleanDomain,
        userId: session.user.id,
        verificationToken,
      },
    })

    return NextResponse.json({ claim, instructions: `Add a TXT record to ${cleanDomain} with value: ${verificationToken}` }, { status: 201 })
  }

  if (action === "verify") {
    const claimId = body.claimId
    const claim = await prisma.domainClaim.findFirst({ where: { id: claimId, userId: session.user.id } })
    if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    if (claim.verifiedAt) return NextResponse.json({ error: "Already verified" }, { status: 400 })

    // DNS TXT lookup
    try {
      const records = await dns.resolveTxt(claim.domain)
      const flat = records.map(r => r.join(""))
      if (!flat.includes(claim.verificationToken)) {
        return NextResponse.json({ error: "TXT record not found. Please add the verification token and try again.", expected: claim.verificationToken }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: "DNS lookup failed. Ensure the TXT record is published." }, { status: 400 })
    }

    const updated = await prisma.domainClaim.update({
      where: { id: claimId },
      data: { verifiedAt: new Date() },
    })

    return NextResponse.json({ claim: updated, verified: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
