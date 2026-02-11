import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      brandColor: true,
      brandLogo: true,
      hidePoweredBy: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}
