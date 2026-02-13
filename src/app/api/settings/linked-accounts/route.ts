import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET /api/settings/linked-accounts — list all linked accounts for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { primaryAccountId: true },
    })

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        email: true,
        scope: true,
      },
      orderBy: { id: "asc" },
    })

    // Use the user's primaryAccountId if set, otherwise fall back to first account
    const primaryId = user?.primaryAccountId
    const result = accounts.map((acc, index) => ({
      id: acc.id,
      provider: acc.provider,
      email: acc.email,
      hasCalendarScope: acc.scope?.includes("calendar") ?? false,
      isPrimary: primaryId ? acc.providerAccountId === primaryId : index === 0,
    }))

    return NextResponse.json({ accounts: result })
  } catch (error) {
    console.error("Error fetching linked accounts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/settings/linked-accounts?id=xxx — unlink a non-primary account
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accountId = request.nextUrl.searchParams.get("id")
    if (!accountId) {
      return NextResponse.json({ error: "Missing account id" }, { status: 400 })
    }

    // Get all accounts and user's primary setting
    const [accounts, currentUser] = await Promise.all([
      prisma.account.findMany({
        where: { userId: session.user.id },
        select: { id: true, providerAccountId: true },
        orderBy: { id: "asc" },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { primaryAccountId: true },
      }),
    ])

    if (accounts.length <= 1) {
      return NextResponse.json({ error: "Cannot remove your only linked account" }, { status: 400 })
    }

    const account = accounts.find(a => a.id === accountId)
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Check if this is the primary account
    const isPrimary = currentUser?.primaryAccountId
      ? account.providerAccountId === currentUser.primaryAccountId
      : accounts[0].id === accountId

    if (isPrimary) {
      return NextResponse.json({ error: "Cannot remove primary account" }, { status: 400 })
    }

    await prisma.account.delete({ where: { id: accountId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing linked account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
