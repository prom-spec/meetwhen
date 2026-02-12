import { createHmac, randomBytes } from "crypto"
import prisma from "./prisma"
import { DeliveryStatus, Prisma } from "@prisma/client"
import { webhookLogger } from "./logger"

export type WebhookEvent = "booking.created" | "booking.cancelled" | "booking.rescheduled" | "poll.response_added"

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: "booking.created", label: "Booking Created", description: "Triggered when a new booking is made" },
  { value: "booking.cancelled", label: "Booking Cancelled", description: "Triggered when a booking is cancelled" },
  { value: "booking.rescheduled", label: "Booking Rescheduled", description: "Triggered when a booking is rescheduled" },
  { value: "poll.response_added", label: "Poll Response Added", description: "Triggered when someone responds to a meeting poll" },
]

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: JsonValue
}

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAYS = [60000, 300000, 1800000] // 1min, 5min, 30min

/**
 * Sign a payload using HMAC-SHA256
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`
}

/**
 * Check if a URL points to a private/internal IP or localhost (SSRF protection)
 */
export function isPrivateUrl(urlString: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    return true // Invalid URLs are treated as private
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block localhost variants
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0"
  ) {
    return true
  }

  // Block private IP ranges
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number)
    if (
      a === 10 ||                          // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) ||          // 192.168.0.0/16
      a === 127 ||                         // 127.0.0.0/8
      a === 0 ||                           // 0.0.0.0/8
      (a === 169 && b === 254)             // 169.254.0.0/16 link-local
    ) {
      return true
    }
  }

  // Block common internal hostnames
  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    return true
  }

  // Only allow http/https schemes
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return true
  }

  return false
}

/**
 * Deliver a webhook with retry logic
 */
async function deliverWebhook(
  deliveryId: string,
  url: string,
  payload: WebhookPayload,
  secret: string,
  attempt: number = 1
): Promise<boolean> {
  const payloadString = JSON.stringify(payload)
  const signature = signPayload(payloadString, secret)
  const timestamp = Math.floor(Date.now() / 1000)

  // SSRF check at delivery time (defense in depth)
  if (isPrivateUrl(url)) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.FAILED,
        responseBody: "Error: URL points to a private/internal address",
        attempts: attempt,
      },
    })
    return false
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LetsMeet-Signature": signature,
        "X-LetsMeet-Timestamp": timestamp.toString(),
        "X-Webhook-Event": payload.event,
        "User-Agent": "letsmeet.link-Webhooks/1.0",
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    })

    const responseBody = await response.text().catch(() => "")

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: response.ok ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
        responseCode: response.status,
        responseBody: responseBody.substring(0, 1000), // Truncate to 1000 chars
        attempts: attempt,
      },
    })

    if (response.ok) {
      return true
    }

    // If not successful and we have retries left, schedule retry
    if (attempt < MAX_RETRY_ATTEMPTS) {
      setTimeout(() => {
        deliverWebhook(deliveryId, url, payload, secret, attempt + 1)
      }, RETRY_DELAYS[attempt - 1])
    }

    return false
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: attempt >= MAX_RETRY_ATTEMPTS ? DeliveryStatus.FAILED : DeliveryStatus.PENDING,
        responseBody: `Error: ${errorMessage}`,
        attempts: attempt,
      },
    })

    // Schedule retry if attempts remaining
    if (attempt < MAX_RETRY_ATTEMPTS) {
      setTimeout(() => {
        deliverWebhook(deliveryId, url, payload, secret, attempt + 1)
      }, RETRY_DELAYS[attempt - 1])
    }

    return false
  }
}

/**
 * Trigger webhooks for a specific user and event
 */
export async function triggerWebhook(
  userId: string,
  event: WebhookEvent,
  data: JsonValue
): Promise<void> {
  // Find all active webhooks for this user that subscribe to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      userId,
      active: true,
      events: { has: event },
    },
  })

  if (webhooks.length === 0) {
    return
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }

  // Create delivery records and trigger deliveries
  for (const webhook of webhooks) {
    try {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: data as Prisma.InputJsonValue,
          status: DeliveryStatus.PENDING,
        },
      })

      // Trigger delivery asynchronously (don't await)
      deliverWebhook(delivery.id, webhook.url, payload, webhook.secret).catch((err) => {
        webhookLogger.error("Webhook delivery failed", err, { webhookId: webhook.id, event })
      })
    } catch (err) {
      webhookLogger.error("Failed to create webhook delivery", err, { webhookId: webhook.id, event })
    }
  }
}

/**
 * Send a test webhook
 */
export async function sendTestWebhook(webhookId: string): Promise<{ success: boolean; error?: string }> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (!webhook) {
    return { success: false, error: "Webhook not found" }
  }

  const testPayload: WebhookPayload = {
    event: "booking.created",
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: "This is a test webhook delivery from letsmeet.link",
      booking: {
        id: "test_booking_123",
        eventType: { title: "Test Event", duration: 30 },
        guestName: "Test Guest",
        guestEmail: "test@example.com",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        status: "CONFIRMED",
      },
    },
  }

  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event: "booking.created",
      payload: testPayload.data as Prisma.InputJsonValue,
      status: DeliveryStatus.PENDING,
    },
  })

  const payloadString = JSON.stringify(testPayload)
  const signature = signPayload(payloadString, webhook.secret)
  const timestamp = Math.floor(Date.now() / 1000)

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LetsMeet-Signature": signature,
        "X-LetsMeet-Timestamp": timestamp.toString(),
        "X-Webhook-Event": testPayload.event,
        "User-Agent": "letsmeet.link-Webhooks/1.0",
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000),
    })

    const responseBody = await response.text().catch(() => "")

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: response.ok ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
        responseCode: response.status,
        responseBody: responseBody.substring(0, 1000),
        attempts: 1,
      },
    })

    return {
      success: response.ok,
      error: response.ok ? undefined : `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.FAILED,
        responseBody: `Error: ${errorMessage}`,
        attempts: 1,
      },
    })

    return { success: false, error: errorMessage }
  }
}

/**
 * Alias for triggerWebhook — convenience function for firing webhooks from routes.
 */
export const fireWebhook = triggerWebhook
