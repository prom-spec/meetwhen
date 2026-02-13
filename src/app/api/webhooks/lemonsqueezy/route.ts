import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ""

function verifySignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET || !signature) return false
  try {
    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET)
    const digest = hmac.update(rawBody).digest("hex")
    const digestBuf = Buffer.from(digest, "utf8")
    const sigBuf = Buffer.from(signature, "utf8")
    if (digestBuf.byteLength !== sigBuf.byteLength) return false
    return crypto.timingSafeEqual(digestBuf, sigBuf)
  } catch {
    return false
  }
}

function mapVariantToPlan(variantName: string): string {
  const lower = (variantName || "").toLowerCase()
  if (lower.includes("enterprise")) return "ENTERPRISE"
  if (lower.includes("pro")) return "PRO"
  return "FREE"
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-signature") || ""

  if (!verifySignature(rawBody, signature)) {
    console.error("[LemonSqueezy] Invalid webhook signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const eventName = payload.meta?.event_name
  const customData = payload.meta?.custom_data || {}
  const userId = customData.user_id
  const attrs = payload.data?.attributes || {}
  const lemonCustomerId = String(attrs.customer_id || "")
  const lemonSubscriptionId = String(payload.data?.id || "")
  const variantName = attrs.variant_name || attrs.product_name || ""
  const status = attrs.status

  console.log(`[LemonSqueezy] Event: ${eventName}, userId: ${userId}, status: ${status}, variant: ${variantName}`)

  if (!userId) {
    console.warn("[LemonSqueezy] No user_id in custom data, skipping DB update")
    return NextResponse.json({ received: true })
  }

  // Verify user exists before updating
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    console.warn(`[LemonSqueezy] User ${userId} not found, ignoring`)
    return NextResponse.json({ received: true })
  }

  // For update/cancel events on existing subscriptions, verify subscription ID matches
  if (eventName !== "subscription_created" && user.lemonSubscriptionId && user.lemonSubscriptionId !== lemonSubscriptionId) {
    console.warn(`[LemonSqueezy] Subscription ID mismatch for user ${userId}: expected ${user.lemonSubscriptionId}, got ${lemonSubscriptionId}`)
    return NextResponse.json({ received: true })
  }

  try {
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated": {
        const plan = mapVariantToPlan(variantName)
        const effectivePlan = ["cancelled", "expired"].includes(status) ? "FREE" : plan
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: effectivePlan,
            lemonCustomerId,
            lemonSubscriptionId,
            ...(attrs.ends_at ? { planExpiresAt: new Date(attrs.ends_at) } : {}),
          },
        })
        break
      }

      case "subscription_cancelled": {
        // Set expiry and downgrade plan when period ends
        const endsAt = attrs.ends_at ? new Date(attrs.ends_at) : new Date()
        const isPastEnd = endsAt <= new Date()
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: isPastEnd ? "FREE" : user.plan, // downgrade immediately if already past end
            planExpiresAt: endsAt,
          },
        })
        break
      }

      case "subscription_payment_success": {
        const plan = mapVariantToPlan(variantName)
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan,
            ...(attrs.renews_at ? { planExpiresAt: new Date(attrs.renews_at) } : {}),
          },
        })
        break
      }

      case "subscription_payment_failed": {
        console.warn(`[LemonSqueezy] Payment failed for user ${userId}`)
        break
      }

      default:
        console.log(`[LemonSqueezy] Unhandled event: ${eventName}`)
    }
  } catch (err) {
    // Return 500 for transient DB errors so Lemon Squeezy retries
    console.error(`[LemonSqueezy] DB error:`, err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
