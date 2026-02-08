/**
 * In-memory IP-based rate limiter for serverless environments.
 * Each RateLimiter instance tracks requests per IP within a sliding window.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private readonly limit: number
  private readonly windowMs: number

  constructor(opts: { limit: number; windowMs: number }) {
    this.limit = opts.limit
    this.windowMs = opts.windowMs
  }

  /**
   * Check if a request from this IP is allowed.
   * Returns { allowed, remaining, resetAt }.
   */
  check(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const entry = this.store.get(ip)

    // Clean expired entry
    if (entry && now >= entry.resetAt) {
      this.store.delete(ip)
    }

    const current = this.store.get(ip)

    if (!current) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs })
      return { allowed: true, remaining: this.limit - 1, resetAt: now + this.windowMs }
    }

    if (current.count >= this.limit) {
      return { allowed: false, remaining: 0, resetAt: current.resetAt }
    }

    current.count++
    return { allowed: true, remaining: this.limit - current.count, resetAt: current.resetAt }
  }
}

// Shared instances
export const bookingRateLimiter = new RateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 }) // 5/hour
export const mcpRateLimiter = new RateLimiter({ limit: 30, windowMs: 60 * 1000 }) // 30/min
export const analyticsRateLimiter = new RateLimiter({ limit: 60, windowMs: 60 * 1000 }) // 60/min

/** Extract client IP from request */
export function getClientIp(request: Request): string {
  const headers = request.headers
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  )
}
