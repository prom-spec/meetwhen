import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listAllUserCalendars } from "@/lib/calendar"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await listAllUserCalendars(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching calendars:", error)
    return NextResponse.json({ error: "Failed to fetch calendars" }, { status: 500 })
  }
}
