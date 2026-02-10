# LetsMeet Security Audit Report

**Date:** 2026-02-09  
**Auditor:** Automated Security Review  
**Scope:** Authentication, API security, MCP key handling, data exposure, environment variables

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 5 |
| MEDIUM | 6 |
| LOW | 4 |

---

## CRITICAL

### C1. Database Credentials Committed to Repository

**File:** `.env`  
**Issue:** Production Neon database URL with full credentials is committed in `.env`:
```
DATABASE_URL="postgresql://neondb_owner:npg_F16OmtYjuJNB@ep-dawn-dawn-aipyb3ey-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
```
This gives anyone with repo access full database read/write/delete.

**Fix:**
1. **Immediately rotate** the Neon database password
2. Add `.env` to `.gitignore` (use `.env.example` with placeholder values)
3. Remove `.env` from git history: `git filter-branch` or `git-filter-repo`

```bash
echo ".env" >> .gitignore
# .env.example:
# DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
```

---

### C2. MCP API Endpoint Has Wildcard CORS — Allows Any Origin

**File:** `src/app/api/mcp/route.ts` (lines ~350-360)  
**Issue:** The OPTIONS handler returns `Access-Control-Allow-Origin: *`, which means **any website** can make authenticated requests to the MCP endpoint using a stolen API key. Combined with `Authorization` in allowed headers, this enables cross-origin API key abuse from malicious sites.

```typescript
// CURRENT — dangerous
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
```

**Fix:** MCP is machine-to-machine. Either remove CORS entirely or restrict to known origins:

```typescript
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXTAUTH_URL || "https://letsmeet.app",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
```

Also add the CORS headers to the POST response so browsers enforce it:
```typescript
// In POST handler, before returning:
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NEXTAUTH_URL || "https://letsmeet.app",
};
return NextResponse.json(responseBody, { headers: corsHeaders });
```

---

### C3. Booking Guest Authorization Uses Email in Query String — Trivially Bypassable

**File:** `src/app/api/bookings/[id]/route.ts`  
**Issue:** Guest access to GET/DELETE/PATCH booking details is authorized by passing `?email=` as a query parameter. Anyone who knows or guesses a booking ID + guest email can view, cancel, or reschedule any booking. Booking IDs are CUIDs (predictable-ish), and guest emails may be leaked in URLs/logs.

```typescript
const isGuest = email && email.toLowerCase() === booking.guestEmail.toLowerCase()
if (!isHost && !isGuest) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Fix:** Use signed, time-limited tokens for guest actions instead of raw email:

```typescript
// lib/booking-tokens.ts
import { createHmac } from "crypto";

const SECRET = process.env.BOOKING_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "fallback";

export function generateBookingToken(bookingId: string, email: string): string {
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `${bookingId}:${email.toLowerCase()}:${expires}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyBookingToken(token: string, bookingId: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [id, email, expiresStr, sig] = decoded.split(":");
    if (id !== bookingId) return null;
    if (Date.now() > parseInt(expiresStr)) return null;
    const expected = createHmac("sha256", SECRET)
      .update(`${id}:${email}:${expiresStr}`)
      .digest("hex").slice(0, 16);
    if (sig !== expected) return null;
    return email;
  } catch { return null; }
}
```

Then replace `?email=` with `?token=` in all booking action URLs and email links.

---

## HIGH

### H1. No Rate Limiting on Public Booking Endpoint — Spam/Abuse Vector

**File:** `src/app/api/bookings/route.ts` (POST)  
**Issue:** The booking creation endpoint is **unauthenticated** (any visitor can create bookings) and has **no rate limiting**. An attacker can:
- Fill up a user's entire calendar with fake bookings
- Trigger unlimited webhook deliveries
- Cause mass email sends (confirmation/notification emails)

**Fix:** Add rate limiting by IP:

```typescript
// Simple IP-based rate limiter (use Redis in production)
const bookingRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkBookingRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = bookingRateLimit.get(ip);
  if (!limit || now > limit.resetAt) {
    bookingRateLimit.set(ip, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (limit.count >= 5) return false; // 5 bookings per IP per hour
  limit.count++;
  return true;
}

// In POST handler:
const ip = request.headers.get("x-forwarded-for") || "unknown";
if (!checkBookingRateLimit(ip)) {
  return NextResponse.json({ error: "Too many booking attempts" }, { status: 429 });
}
```

---

### H2. No Rate Limiting on MCP API — Key Brute-Force Possible

**File:** `src/app/api/mcp/route.ts`  
**Issue:** No rate limiting on failed authentication attempts. An attacker can brute-force API keys. While `mk_` keys have 43 chars of entropy (strong), the lack of rate limiting still allows abuse attempts and potential DoS via repeated hash computations + DB lookups.

**Fix:**
```typescript
const mcpRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkMcpRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = mcpRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    mcpRateLimit.set(ip, { count: 1, resetAt: now + 60000 }); // 1 min window
    return true;
  }
  if (entry.count >= 30) return false; // 30 requests per minute
  entry.count++;
  return true;
}

// At start of POST handler:
const ip = req.headers.get("x-forwarded-for") || "unknown";
if (!checkMcpRateLimit(ip)) {
  return NextResponse.json(
    { jsonrpc: "2.0", error: { code: -32001, message: "Rate limit exceeded" }, id: null },
    { status: 429 }
  );
}
```

---

### H3. Analytics Tracking Endpoint Allows Enumeration of Event Type IDs

**File:** `src/app/api/analytics/track/route.ts`  
**Issue:** The POST endpoint is unauthenticated and verifies event type existence, enabling enumeration:
```typescript
const eventType = await prisma.eventType.findUnique({
  where: { id: eventTypeId },
})
if (!eventType) {
  return NextResponse.json({ error: "Event type not found" }, { status: 404 })
}
```
An attacker can enumerate all valid event type IDs and create unlimited fake page view records (data pollution).

**Fix:** Remove the existence check (accept any ID, let FK constraint handle it silently) and add rate limiting:

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventTypeId, stage, sessionId } = body

    if (!eventTypeId || !stage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const validStages = ["view", "slot_selected", "booking_confirmed"]
    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
    }

    // Don't verify event type — just try to create, handle FK error silently
    try {
      await prisma.pageView.create({
        data: { eventTypeId, stage, sessionId: sessionId || null },
      })
    } catch {
      // Silently fail on FK violation — don't reveal existence
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

---

### H4. Webhook Secret Exposed in API Response

**File:** `src/app/api/webhooks/route.ts` (GET), `src/app/api/webhooks/[id]/route.ts` (GET, PATCH)  
**Issue:** The webhook list and detail endpoints return the full `secret` field in responses. The webhook signing secret should **never** be sent to the client after creation.

```typescript
// GET returns full webhook object including `secret`
const webhooks = await prisma.webhook.findMany({...})
// PATCH returns updated webhook including `secret`
const webhook = await prisma.webhook.update({...})
```

**Fix:** Exclude `secret` from all read responses:

```typescript
// In GET /api/webhooks
const webhooks = await prisma.webhook.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    url: true,
    events: true,
    active: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { deliveries: true } },
  },
  // Note: `secret` is NOT selected
})

// In GET/PATCH /api/webhooks/[id], add select clause excluding secret
```

Only show the secret **once** at creation time, similar to API key handling.

---

### H5. No CSRF Protection on State-Changing API Routes

**File:** All API routes  
**Issue:** No middleware enforcing CSRF protection. Next.js App Router API routes accept requests from any origin. While session cookies have `SameSite=Lax` by default (via NextAuth), this doesn't protect against certain attack vectors (e.g., top-level navigations triggering POST via form submission).

**Fix:** Add a middleware that checks `Origin` or `Referer` header on state-changing requests:

```typescript
// src/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Only check state-changing methods
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin")
    const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000"
    
    // Allow requests with no origin (same-origin, non-browser clients)
    // Allow MCP endpoint (uses Bearer auth, not cookies)
    if (origin && !request.nextUrl.pathname.startsWith("/api/mcp")) {
      const allowedHost = new URL(allowedOrigin).host
      const requestHost = new URL(origin).host
      if (requestHost !== allowedHost) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
```

---

## MEDIUM

### M1. No Input Validation/Sanitization on Booking Guest Fields

**File:** `src/app/api/bookings/route.ts`  
**Issue:** `guestName`, `guestEmail`, `guestTimezone`, and `notes` are passed directly from user input to the database without validation. While Prisma prevents SQL injection, there's no:
- Email format validation
- String length limits
- XSS sanitization (if values are rendered in HTML emails)

**Fix:**
```typescript
import { z } from "zod"

const bookingSchema = z.object({
  eventTypeId: z.string().cuid(),
  guestName: z.string().min(1).max(200).trim(),
  guestEmail: z.string().email().max(320),
  guestTimezone: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  startTime: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
})

// In POST handler:
const parsed = bookingSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
}
```

---

### M2. Webhook URL Allows SSRF via Internal Network Requests

**File:** `src/app/api/webhooks/route.ts` (POST), `src/lib/webhooks.ts`  
**Issue:** Webhook URLs are validated for HTTPS but not checked against internal/private IPs. An attacker can register webhooks pointing to `https://169.254.169.254/` (cloud metadata), `https://internal-service.local/`, etc.

**Fix:**
```typescript
function isPrivateUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    const hostname = url.hostname
    // Block common private/metadata IPs
    const blocked = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^\[::1\]/,
      /\.internal$/i,
      /\.local$/i,
    ]
    return blocked.some(pattern => pattern.test(hostname))
  } catch { return true }
}

// In webhook creation:
if (isPrivateUrl(url)) {
  return NextResponse.json({ error: "URL must not point to private/internal addresses" }, { status: 400 })
}
```

---

### M3. MCP `create_booking` Doesn't Validate Guest Email or Verify Slot Availability Against Availability Rules

**File:** `src/app/api/mcp/route.ts` (`handleCreateBooking`)  
**Issue:** The MCP booking creation only checks for conflicting bookings but does **not** verify the requested time falls within the host's availability windows. An MCP user could book meetings outside their own availability hours.

**Fix:** Add availability window validation before creating the booking, similar to the slot generation logic in the regular booking flow.

---

### M4. Webhook Secret Generation Uses `Math.random()` — Not Cryptographically Secure

**File:** `src/lib/webhooks.ts`  
**Issue:**
```typescript
export function generateWebhookSecret(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let secret = "whsec_"
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return secret
}
```
`Math.random()` is not cryptographically secure and can be predicted.

**Fix:**
```typescript
import { randomBytes } from "crypto"

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`
}
```

---

### M5. Settings PATCH Allows Arbitrary Field Updates Without Type Validation

**File:** `src/app/api/settings/route.ts`  
**Issue:** The PATCH handler accepts any value types for `name`, `timezone`, `calendarSyncEnabled` without validation. A malicious client could send `name` as a very long string, `timezone` as an invalid value, etc.

**Fix:**
```typescript
const settingsSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_-]+$/i).optional(),
  timezone: z.string().max(100).refine(tz => {
    try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true } catch { return false }
  }, "Invalid timezone").optional(),
  calendarSyncEnabled: z.boolean().optional(),
})
```

---

### M6. Chat Endpoint Rate Limit Is In-Memory — Resets on Deploy/Restart

**File:** `src/app/api/chat/route.ts`  
**Issue:** Rate limiting uses `Map<string, ...>` which is process-local and resets on every deployment or serverless cold start. On serverless platforms (Vercel, Railway), this provides essentially zero rate limiting.

**Fix:** Use Redis or a persistent store for rate limiting. For Railway (long-running process), the in-memory approach is marginally better but still inadequate for multi-instance deploys. Consider Upstash Redis:

```typescript
// Use @upstash/ratelimit for production
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
})
```

---

## LOW

### L1. Host Email Exposed in Public Booking Response

**File:** `src/app/api/bookings/route.ts` (POST response)  
**Issue:** The booking creation response includes the host's email address via `include: { host: { select: { name, email, timezone } } }`. This leaks the host's email to any anonymous booker.

**Fix:** Remove `email` from the host select in the booking response:
```typescript
host: { select: { name: true, timezone: true } }, // Remove `email: true`
```

---

### L2. Event Type `[id]/public` Route Exposes Host User ID

**File:** `src/app/api/event-types/[id]/public/route.ts`  
**Issue:** The response includes `user.id` (internal database ID) in the public endpoint. Internal IDs should not be exposed publicly.

**Fix:**
```typescript
user: {
  select: {
    name: true,
    username: true,
    timezone: true,
    // Remove `id: true`
  },
},
```

---

### L3. No `NEXTAUTH_SECRET` Enforcement

**File:** `src/lib/auth.ts`  
**Issue:** `authOptions` does not explicitly set or validate `NEXTAUTH_SECRET`. In production, NextAuth will error if it's missing, but there's no startup check. If accidentally unset, sessions become insecure.

**Fix:** Add explicit validation:
```typescript
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET must be set in production")
}
```

---

### L4. `parseInt()` Without Radix on User-Supplied Values

**File:** `src/app/api/event-types/route.ts`, `src/app/api/event-types/[id]/route.ts`  
**Issue:** `parseInt(duration)`, `parseInt(bufferBefore)`, etc. are used on user input. While modern JS defaults to base 10, explicitly passing radix 10 is safer and prevents edge cases with strings like `"08"`.

**Fix:** Use `Number()` instead, which is more predictable:
```typescript
duration: Number(duration),
// or
duration: parseInt(duration, 10),
```

---

## Recommendations (Non-Finding)

1. **Add a `src/middleware.ts`** — Currently there is no Next.js middleware at all. Add one for CSRF, rate limiting headers, and security headers (CSP, X-Frame-Options, etc.).

2. **Add API key scoping** — Currently MCP API keys have full access to all tools. Consider adding scope/permission fields to the `ApiKey` model.

3. **Limit API key count per user** — No limit on how many API keys a user can create. Add a cap (e.g., 10).

4. **Add request logging/audit trail** — MCP API key usage is tracked via `lastUsedAt` but no detailed audit log of what actions were performed.

5. **Consider `Secure` and `HttpOnly` flags** — Verify NextAuth session cookies have proper flags set (they should by default, but worth confirming in production).

6. **Add Zod validation globally** — Multiple endpoints parse JSON bodies without any schema validation. Adopt Zod or similar across all routes.
