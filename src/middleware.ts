import { NextRequest, NextResponse } from "next/server"

/**
 * Security middleware:
 * - CSRF protection via Origin header validation on mutating API requests
 * - Security headers (CSP, HSTS, etc.) on all responses
 * - Rate limiting on auth endpoints
 * - Infrastructure header stripping
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

// Paths exempt from CSRF check
const CSRF_EXEMPT_PATHS = [
  "/api/mcp",           // Uses Bearer token auth
  "/api/analytics/track", // Public endpoint
  "/api/chat",          // Session-authenticated, called from same origin
  "/api/cron",          // Uses Bearer token auth (CRON_SECRET)
  "/api/webhooks/lemonsqueezy", // Uses HMAC signature auth
]

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p))
}

// --- Rate limiting for auth endpoints ---
const AUTH_RATE_LIMIT = 20 // requests per window
const AUTH_RATE_WINDOW_MS = 60 * 1000 // 1 minute

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// Periodically clean up stale entries (every 5 minutes)
let lastCleanup = Date.now()
function cleanupRateLimits() {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60 * 1000) return
  lastCleanup = now
  for (const [key, val] of rateLimitMap) {
    if (val.resetAt < now) rateLimitMap.delete(key)
  }
}

function isRateLimited(ip: string): boolean {
  cleanupRateLimits()
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > AUTH_RATE_LIMIT
}

// CSP policy
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://static.cloudflareinsights.com https://app.lemonsqueezy.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://accounts.google.com https://www.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://cloudflareinsights.com https://app.lemonsqueezy.com",
  "frame-src 'self' https://letsmeet.link https://www.letsmeet.link https://accounts.google.com https://app.lemonsqueezy.com https://*.lemonsqueezy.com",
].join("; ")

// Known app hostnames that should NOT trigger custom domain routing
const APP_HOSTS = new Set([
  "letsmeet.link",
  "www.letsmeet.link",
  "localhost",
  "localhost:3000",
])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") || ""

  // Custom domain routing: if the host isn't our app, look up the user
  if (!APP_HOSTS.has(host) && !host.endsWith(".vercel.app") && !host.endsWith(".railway.app")) {
    // Only rewrite public-facing pages, not API/static routes
    if (!pathname.startsWith("/api/") && !pathname.startsWith("/_next/") && !pathname.startsWith("/dashboard")) {
      // Rewrite to /_custom-domain/[host]/[...path]
      // The actual lookup happens in the page component via a server-side DB query
      const url = request.nextUrl.clone()
      url.pathname = `/_custom-domain${pathname}`
      url.searchParams.set("__domain", host)
      const isEmbed = request.nextUrl.searchParams.get("embed") === "true"
      const response = NextResponse.rewrite(url)
      // Add security headers on the rewritten response too
      addSecurityHeaders(response, isEmbed)
      return response
    }
  }

  // Rate limit auth endpoints
  if (pathname.startsWith("/api/auth/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }
  }

  // Only apply CSRF to /api/* mutating requests
  if (
    pathname.startsWith("/api/") &&
    MUTATING_METHODS.has(request.method) &&
    !isCsrfExempt(pathname)
  ) {
    const origin = request.headers.get("origin")
    const host = request.headers.get("host")

    // Origin must be present and match the host
    if (origin) {
      try {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          return NextResponse.json(
            { error: "CSRF validation failed" },
            { status: 403 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: "CSRF validation failed" },
          { status: 403 }
        )
      }
    }
    // If no Origin header, require X-Requested-With header as CSRF proof
    if (!origin && !request.headers.get("x-requested-with")) {
      if (!pathname.startsWith("/api/auth/")) {
        return NextResponse.json(
          { error: "CSRF validation failed" },
          { status: 403 }
        )
      }
    }
  }

  const isEmbed = request.nextUrl.searchParams.get("embed") === "true"
  const response = NextResponse.next()
  addSecurityHeaders(response, isEmbed)
  return response
}

function addSecurityHeaders(response: NextResponse, embedMode = false) {
  if (!embedMode) {
    response.headers.set("X-Frame-Options", "DENY")
  }
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  response.headers.set("Content-Security-Policy", embedMode ? CSP_POLICY + "; frame-ancestors *" : CSP_POLICY)
  response.headers.delete("x-powered-by")
  response.headers.delete("server")
  for (const key of response.headers.keys()) {
    if (key.toLowerCase().startsWith("x-railway-")) {
      response.headers.delete(key)
    }
  }
}

export const config = {
  matcher: [
    // Apply to all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}
