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

    // The first account is considered the primary one
    const result = accounts.map((acc, index) => ({
      id: acc.id,
      provider: acc.provider,
      email: acc.email,
      hasCalendarScope: acc.scope?.includes("calendar") ?? false,
      isPrimary: index === 0,
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

    // Get all accounts for this user
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: { id: true },
      orderBy: { id: "asc" },
    })

    if (accounts.length <= 1) {
      return NextResponse.json({ error: "Cannot remove your only linked account" }, { status: 400 })
    }

    // Ensure the account belongs to this user and is not the primary (first)
    const account = accounts.find(a => a.id === accountId)
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    if (accounts[0].id === accountId) {
      return NextResponse.json({ error: "Cannot remove primary account" }, { status: 400 })
    }

    await prisma.account.delete({ where: { id: accountId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing linked account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
