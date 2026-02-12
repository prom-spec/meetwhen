import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

interface RouteParams {
  params: Promise<{ id: string }>
}

async function isTeamAdmin(teamId: string, userId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  })
  return membership?.role === "OWNER" || membership?.role === "ADMIN"
}

// GET /api/teams/[id]/sso — get SSO config
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!(await isTeamAdmin(id, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const ssoConfig = await prisma.sSOConfig.findUnique({
      where: { teamId: id },
    })

    return NextResponse.json({ ssoConfig })
  } catch (error) {
    console.error("Failed to get SSO config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/teams/[id]/sso — create or update SSO config
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!(await isTeamAdmin(id, session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { domain, entryPoint, issuer, cert, enabled } = body

    if (!domain || !entryPoint || !issuer || !cert) {
      return NextResponse.json(
        { error: "Missing required fields: domain, entryPoint, issuer, cert" },
        { status: 400 }
      )
    }

    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id } })
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Check domain isn't taken by another team
    const existingDomain = await prisma.sSOConfig.findUnique({
      where: { domain },
    })
    if (existingDomain && existingDomain.teamId !== id) {
      return NextResponse.json(
        { error: "Domain is already configured for another team" },
        { status: 409 }
      )
    }

    const ssoConfig = await prisma.sSOConfig.upsert({
      where: { teamId: id },
      create: {
        teamId: id,
        domain: domain.toLowerCase().trim(),
        entryPoint,
        issuer,
        cert,
        enabled: enabled ?? false,
      },
      update: {
        domain: domain.toLowerCase().trim(),
        entryPoint,
        issuer,
        cert,
        enabled: enabled ?? false,
      },
    })

    return NextResponse.json({ ssoConfig })
  } catch (error) {
    console.error("Failed to update SSO config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
