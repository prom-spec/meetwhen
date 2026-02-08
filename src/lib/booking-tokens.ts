import { createHmac } from "crypto"

const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set")
  return secret
}

/**
 * Generate an HMAC-SHA256 token for guest booking access.
 * Replaces email-in-query-string auth pattern.
 */
export function generateBookingToken(bookingId: string, email: string): string {
  const hmac = createHmac("sha256", getSecret())
  hmac.update(`${bookingId}:${email.toLowerCase()}`)
  return hmac.digest("hex")
}

/**
 * Verify a booking token against the booking's guest email.
 */
export function verifyBookingToken(token: string, bookingId: string, guestEmail: string): boolean {
  const expected = generateBookingToken(bookingId, guestEmail)
  // Constant-time comparison
  if (token.length !== expected.length) return false
  let result = 0
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return result === 0
}
