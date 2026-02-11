import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import dns from "dns/promises"

const schema = z.object({
  domain: z.string().min(1).max(253).regex(
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    "Invalid domain format"
  ).nullable(),
})

async function verifyCname(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveCname(domain)
    return records.some((r) => r.toLowerCase() === "letsmeet.link" || r.toLowerCase() === "letsmeet.link.")
  } catch {
    return false
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { customDomain: true, customDomainVerified: true },
  })

  return NextResponse.json({
    customDomain: user?.customDomain || null,
    verified: user?.customDomainVerified || false,
  })
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid domain", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { domain } = parsed.data

  // Remove domain
  if (!domain) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { customDomain: null, customDomainVerified: false },
    })
    return NextResponse.json({ customDomain: null, verified: false })
  }

  const normalized = domain.toLowerCase().trim()

  // Check uniqueness
  const existing = await prisma.user.findFirst({
    where: { customDomain: normalized, NOT: { id: session.user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: "Domain already in use by another account" }, { status: 409 })
  }

  // Verify CNAME
  const verified = await verifyCname(normalized)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { customDomain: normalized, customDomainVerified: verified },
  })

  return NextResponse.json({ customDomain: normalized, verified })
}
