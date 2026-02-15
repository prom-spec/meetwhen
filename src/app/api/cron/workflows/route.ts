import { NextResponse } from "next/server"
import {
  processPendingWorkflowSteps,
  processBeforeMeetingTriggers,
  processAfterMeetingTriggers,
} from "@/lib/workflows"
import { apiLogger } from "@/lib/logger"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = {
    pendingSteps: await processPendingWorkflowSteps(),
    beforeMeeting: await processBeforeMeetingTriggers(),
    afterMeeting: await processAfterMeetingTriggers(),
  }

  return NextResponse.json({ ok: true, results })
}
