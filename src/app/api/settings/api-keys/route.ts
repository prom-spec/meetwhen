import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateApiKey, maskApiKey } from "@/lib/api-keys"
import { apiLogger } from "@/lib/logger"

// GET - List user's API keys
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return NextResponse.json({
    keys: keys.map((k) => ({
      ...k,
      maskedKey: maskApiKey(k.keyPrefix),
    })),
  })
}

// POST - Create new API key
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const name = body.name || "Default"

  // Generate new key
  const { plainKey, keyHash, keyPrefix } = generateApiKey()

  // Store in DB
  const apiKey = await prisma.apiKey.create({
    data: {
      keyHash,
      keyPrefix,
      name,
      userId: session.user.id,
    },
  })

  // Return plain key ONCE (never stored)
  return NextResponse.json({
    id: apiKey.id,
    key: plainKey, // Shown only once!
    name: apiKey.name,
    createdAt: apiKey.createdAt,
  })
}

// DELETE - Revoke an API key
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing key ID" }, { status: 400 })
  }

  // Verify ownership
  const key = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!key) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 })
  }

  // Soft delete (revoke)
  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
