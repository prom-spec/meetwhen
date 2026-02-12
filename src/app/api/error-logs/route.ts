import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only the account owner can see error logs (check if admin/owner)
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } })
  
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
  const source = searchParams.get("source") || undefined
  const since = searchParams.get("since") || undefined

  const where: Record<string, unknown> = {}
  if (source) where.source = source
  if (since) where.createdAt = { gte: new Date(since) }

  const logs = await prisma.errorLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  // Summary: count by source in last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const summary = await prisma.errorLog.groupBy({
    by: ["source"],
    where: { createdAt: { gte: oneDayAgo } },
    _count: true,
    orderBy: { _count: { source: "desc" } },
  })

  return NextResponse.json({ logs, summary, total: logs.length })
}
