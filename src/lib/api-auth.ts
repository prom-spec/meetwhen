import { NextRequest, NextResponse } from "next/server"
import { hashApiKey } from "./api-keys"
import prisma from "./prisma"

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100 // requests per window
const RATE_WINDOW = 60 * 1000 // 1 minute

export function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export interface ApiUser {
  id: string
  email: string
  name: string | null
  username: string | null
  timezone: string
  plan: string
}

export async function authenticateApiKey(req: NextRequest): Promise<ApiUser | NextResponse> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header. Use: Bearer mk_..." }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const keyHash = hashApiKey(token)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: { select: { id: true, email: true, name: true, username: true, timezone: true, plan: true } } },
  })

  if (!apiKey || apiKey.revokedAt) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 })
  }

  // Rate limit by API key
  if (!checkRateLimit(apiKey.id)) {
    return NextResponse.json({ error: "Rate limit exceeded. Max 100 requests per minute." }, { status: 429 })
  }

  // Update last used
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return apiKey.user
}
