import { NextRequest, NextResponse } from "next/server"

/**
 * Security middleware:
 * - CSRF protection via Origin header validation on mutating API requests
 * - Security headers on all responses
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

// Paths exempt from CSRF check
const CSRF_EXEMPT_PATHS = [
  "/api/mcp",           // Uses Bearer token auth
  "/api/analytics/track", // Public endpoint
]

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
    // If no Origin header, allow (same-origin requests from some clients omit it)
    // Server-side callers (curl, etc.) also omit Origin — auth protects those routes
  }

  const response = NextResponse.next()

  // Security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  return response
}

export const config = {
  matcher: ["/api/:path*"],
}
