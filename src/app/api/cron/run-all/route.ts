import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "http://localhost:3000"

  const results: Record<string, unknown> = {}

  for (const job of ["post-meeting", "send-reminders", "workflows"]) {
    try {
      const res = await fetch(`${baseUrl}/api/cron/${job}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cronSecret}` },
      })
      results[job] = { status: res.status, body: await res.json() }
    } catch (e) {
      results[job] = { error: String(e) }
    }
  }

  return NextResponse.json({ ok: true, results })
}
