import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

const upgradeSchema = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = upgradeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }
    const { plan } = parsed.data

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        plan,
        planUpdatedAt: new Date(),
      },
    })

    logAudit(user.id, "billing.plan_changed", "settings", user.id, { plan })

    return NextResponse.json({ success: true, plan: user.plan })
  } catch (error) {
    console.error("Upgrade error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
