# MeetWhen Security Audit — 2026-02-10

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1     |
| High     | 5     |
| Medium   | 7     |
| Low      | 3     |

---

## Critical

### C1 — SSRF via Webhook PATCH (localhost bypass)

- **File:** `src/app/api/webhooks/[id]/route.ts`, line ~95
- **Description:** The webhook **POST** (create) correctly blocks private/internal URLs via `isPrivateUrl()` and requires HTTPS. However, the **PATCH** (update) endpoint explicitly allows `http://localhost` URLs:
  ```ts
  if (!body.url.startsWith("https://") && !body.url.startsWith("http://localhost")) {
  ```
  An attacker with a valid session can create a webhook pointing to `http://localhost:PORT/internal-endpoint`, enabling SSRF attacks against internal services, cloud metadata endpoints (via DNS rebinding), or the app itself.
- **Fix:** Apply the same `isPrivateUrl()` check and HTTPS-only requirement used in POST.

---

## High

### H1 — CSRF Middleware Allows Missing Origin Header

- **File:** `src/middleware.ts`, lines 25-38
- **Description:** The CSRF protection only validates when an `Origin` header is **present**. When missing, the request is allowed through. Attackers can use non-browser clients or certain cross-origin techniques (e.g., `<form>` submissions in some configurations) that omit the `Origin` header to bypass CSRF protection entirely. While authenticated routes require a session cookie, this weakens the defense-in-depth.
- **Fix:** For API mutating requests, require either a valid `Origin` header or a custom header (e.g., `X-Requested-With`) that simple cross-origin requests can't set.

### H2 — No Input Validation on Availability Schedules

- **File:** `src/app/api/availability/route.ts`, POST handler (~line 30)
- **Description:** The `schedules` array items are not validated. `dayOfWeek` could be any number (negative, >6), `startTime`/`endTime` could be arbitrary strings (not `HH:MM` format), or even objects. Prisma will store whatever is passed. This can cause application logic errors and potential data corruption.
- **Fix:** Add Zod schema validation for each schedule item: `dayOfWeek` (0-6), `startTime`/`endTime` (regex `^\d{2}:\d{2}$`), and validate `startTime < endTime`.

### H3 — No Input Validation on Event Type Creation

- **File:** `src/app/api/event-types/route.ts`, POST handler (~line 30)
- **Description:** Event type creation only checks for presence of `title`, `slug`, `duration` but does not validate types, lengths, or formats. `slug` is user-controlled and used in URLs — no length limit, no character validation. `duration` could be negative or extremely large. No Zod schema.
- **Fix:** Add Zod validation: `title` (string, 1-200 chars), `slug` (lowercase alphanumeric + hyphens, 1-50 chars), `duration` (positive integer, reasonable max like 480), etc.

### H4 — Booking Detail API Leaks Host Email

- **File:** `src/app/api/bookings/[id]/route.ts`, GET handler (~line 17)
- **Description:** The `GET /api/bookings/[id]` endpoint returns the full booking including `host.email` via Prisma `include`. While access requires auth (host session or guest token), guest users receiving the booking details can see the host's email address, which may be private.
- **Fix:** Use `select` instead of `include` for the host, excluding `email` from the guest-facing response. Only include email when `isHost` is true.

### H5 — Security Headers Missing on Page Routes

- **File:** `src/middleware.ts`, line 50
- **Description:** The middleware matcher is `["/api/:path*"]`, so security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are only applied to API routes. All page/HTML routes have **no security headers**, making the app vulnerable to clickjacking, MIME sniffing, etc.
- **Fix:** Expand the matcher to cover all routes, or use `next.config.ts` `headers()` for global security headers.

---

## Medium

### M1 — No Content-Security-Policy Header

- **File:** `src/middleware.ts`
- **Description:** No CSP header is set anywhere. This leaves the app vulnerable to XSS attacks — if any user-controlled content is rendered unsanitized, there's no CSP to limit the damage.
- **Fix:** Add a reasonable CSP header. At minimum: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`.

### M2 — No Strict-Transport-Security (HSTS) Header

- **File:** `src/middleware.ts`
- **Description:** HSTS is not set. Users can be downgraded to HTTP via man-in-the-middle attacks.
- **Fix:** Add `Strict-Transport-Security: max-age=31536000; includeSubDomains` header.

### M3 — In-Memory Rate Limiting Ineffective in Serverless

- **File:** `src/lib/rate-limit.ts`
- **Description:** Rate limiting uses an in-memory `Map`. In serverless environments (Railway, Vercel), each instance has its own memory, so limits are per-instance rather than global. An attacker can exceed limits by hitting different instances.
- **Fix:** For production, consider Redis-backed rate limiting (e.g., Upstash) or use Railway's built-in rate limiting. Current implementation is still useful as a baseline defense.

### M4 — Date Override Endpoints Lack Time Format Validation

- **File:** `src/app/api/date-overrides/route.ts`, POST handler
- **Description:** `startTime` and `endTime` are stored as-is without format validation. Invalid time strings could cause parsing errors in slot calculation.
- **Fix:** Validate with regex `^\d{2}:\d{2}$` and ensure start < end.

### M5 — Chat Endpoint Vulnerable to Prompt Injection

- **File:** `src/app/api/chat/route.ts`
- **Description:** User messages are passed directly to the LLM with function-calling capabilities. A crafted message could manipulate the LLM to call `toggle_availability` or `add_date_override` to modify the user's own data in unintended ways. While this only affects the authenticated user's own data, it's still a risk.
- **Fix:** Consider adding confirmation prompts for destructive actions, or limiting function calls per message.

### M6 — Team API Exposes Member Emails to All Members

- **File:** `src/app/api/teams/[id]/members/route.ts`, GET handler
- **Description:** All team members can see every other member's email address. While possibly intentional, it's a privacy concern — regular MEMBER role users may not need to see admin/owner emails.
- **Fix:** Consider restricting email visibility to ADMIN/OWNER roles only.

### M7 — Event Type PATCH Has No Input Validation

- **File:** `src/app/api/event-types/[id]/route.ts`, PATCH handler
- **Description:** Same as H3 — no validation on update. Arbitrary values can be set for `duration`, `bufferBefore`, `bufferAfter`, `minNotice`, `maxDaysAhead`, etc.
- **Fix:** Apply same Zod schema as creation.

---

## Low

### L1 — Dependency Vulnerabilities (Dev Dependencies)

- **Dependencies:** `lodash` (via prisma dev), `hono` (via prisma dev)
- **Description:** `pnpm audit` found moderate vulnerabilities in lodash (prototype pollution) and hono (XSS, cache deception, IP spoofing). All are in **dev dependencies** via Prisma's toolchain and don't affect the production bundle.
- **Fix:** No immediate action needed. These are transitive dev dependencies. Monitor for prisma updates.

### L2 — Analytics Track Endpoint Open to Abuse

- **File:** `src/app/api/analytics/track/route.ts`
- **Description:** The analytics tracking endpoint is intentionally unauthenticated (for public booking pages). An attacker could inflate page view counts with automated requests, though rate limiting (60/min/IP) provides some protection.
- **Fix:** Consider adding session-based deduplication or CAPTCHA for high-volume scenarios.

### L3 — Webhook Secret Not Rotatable

- **File:** `src/app/api/webhooks/[id]/route.ts`
- **Description:** The webhook PATCH endpoint doesn't support rotating the webhook secret. If a secret is compromised, the user must delete and recreate the webhook.
- **Fix:** Add a `POST /api/webhooks/[id]/rotate-secret` endpoint.

---

## Positive Findings

The following security measures are **already well-implemented**:

1. ✅ **MCP API** properly secured with Bearer token + API key hash validation
2. ✅ **Booking tokens** use HMAC-SHA256 with constant-time comparison
3. ✅ **Rate limiting** on bookings (5/hr), MCP (30/min), analytics (60/min), chat (10/hr)
4. ✅ **SSRF protection** on webhook creation with `isPrivateUrl()` check
5. ✅ **Webhook signatures** using HMAC-SHA256 for payload verification
6. ✅ **Prisma ORM** prevents SQL injection by design
7. ✅ **Zod validation** on booking creation and settings update
8. ✅ **Authorization checks** on all dashboard API routes (session required)
9. ✅ **Booking POST** strips host email from response
10. ✅ **Secrets** properly in `.env.local` (gitignored, not committed)
11. ✅ **API keys** stored as SHA-256 hashes, plain key shown only once
12. ✅ **Webhook URL** HTTPS-only requirement on creation
13. ✅ **Error responses** are generic (don't leak stack traces in production)
14. ✅ **NextAuth** configured with database sessions (not JWT)
15. ✅ **Google OAuth** scopes properly configured for calendar access
