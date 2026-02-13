// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ""

function verifySignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET)
  const digest = hmac.update(rawBody).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
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

  try {
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated": {
        const plan = mapVariantToPlan(variantName)
        // If cancelled or expired, revert to FREE
        const effectivePlan = ["cancelled", "expired"].includes(status) ? "FREE" : plan
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: effectivePlan,
            lemonCustomerId,
            lemonSubscriptionId,
            planUpdatedAt: new Date(),
            ...(attrs.ends_at ? { planExpiresAt: new Date(attrs.ends_at) } : {}),
          },
        })
        break
      }

      case "subscription_cancelled": {
        // Set plan to expire at period end
        await prisma.user.update({
          where: { id: userId },
          data: {
            planExpiresAt: attrs.ends_at ? new Date(attrs.ends_at) : new Date(),
            planUpdatedAt: new Date(),
          },
        })
        break
      }

      case "subscription_payment_success": {
        // Extend/confirm plan
        const plan = mapVariantToPlan(variantName)
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan,
            planUpdatedAt: new Date(),
            ...(attrs.renews_at ? { planExpiresAt: new Date(attrs.renews_at) } : {}),
          },
        })
        break
      }

      case "subscription_payment_failed": {
        console.warn(`[LemonSqueezy] Payment failed for user ${userId}`)
        // Could add grace period logic here
        break
      }

      default:
        console.log(`[LemonSqueezy] Unhandled event: ${eventName}`)
    }
  } catch (err) {
    console.error(`[LemonSqueezy] DB error:`, err)
    // Still return 200 to avoid retries for DB issues
  }

  return NextResponse.json({ received: true })
}
