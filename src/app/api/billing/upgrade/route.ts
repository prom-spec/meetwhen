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
    const { plan } = upgradeSchema.parse(body)

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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
