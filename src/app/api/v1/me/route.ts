import { NextRequest, NextResponse } from "next/server"
import { authenticateApiKey } from "@/lib/api-auth"
import { apiLogger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  const user = await authenticateApiKey(req)
  if (user instanceof NextResponse) return user
  return NextResponse.json({ user })
}
