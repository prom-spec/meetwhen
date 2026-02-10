import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// POST /api/settings/link-account — initiate account linking flow
// Creates a server-side linking token, sets an opaque cookie, then redirects to Google OAuth
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Clean up expired tokens for this user
    await prisma.linkingToken.deleteMany({
      where: {
        userId: session.user.id,
        expiresAt: { lt: new Date() },
      },
    })

    // Generate a random opaque token
    const token = crypto.randomUUID()

    // Store linking token in DB with 5-minute expiry
    await prisma.linkingToken.create({
      data: {
        token,
        userId: session.user.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    })

    // Set cookie with the opaque token (NOT the userId)
    const cookieStore = await cookies()
    cookieStore.set("link_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 300, // 5 minutes
      path: "/",
    })

    // Return the URL to redirect to — client will navigate
    return NextResponse.json({
      redirectUrl: "/api/auth/signin/google?callbackUrl=/dashboard/settings",
    })
  } catch (error) {
    console.error("Error initiating account link:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
