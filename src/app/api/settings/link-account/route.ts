import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies } from "next/headers"

// POST /api/settings/link-account — initiate account linking flow
// Sets a cookie with the current user ID, then redirects to Google OAuth
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Set a short-lived cookie to indicate link mode
    const cookieStore = await cookies()
    cookieStore.set("link_account_user_id", session.user.id, {
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
