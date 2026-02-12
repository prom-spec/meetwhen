/**
 * Persistent error logging for debugging and periodic review.
 * Stores errors in the database for dashboard viewing.
 */
import prisma from "@/lib/prisma"

export interface ErrorLogEntry {
  source: string       // e.g., "api/event-types", "api/bookings"
  message: string      // human-readable error
  details?: string     // JSON stringified extra context
  userId?: string      // which user hit it
  statusCode?: number  // HTTP status returned
  requestPath?: string // the API path
}

export async function logError(entry: ErrorLogEntry): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        source: entry.source,
        message: entry.message.slice(0, 1000),
        details: entry.details?.slice(0, 5000) || null,
        userId: entry.userId || null,
        statusCode: entry.statusCode || null,
        requestPath: entry.requestPath || null,
      },
    })
  } catch (err) {
    // Never let error logging break the main flow
    console.error("Failed to write error log:", err)
  }
}

/**
 * Middleware-style wrapper: log validation errors automatically
 */
export function logValidationError(
  source: string,
  fieldErrors: Record<string, string[] | undefined>,
  userId?: string,
  requestPath?: string
): void {
  const fields = Object.entries(fieldErrors)
    .map(([k, v]) => `${k}: ${v?.[0]}`)
    .join("; ")
  
  logError({
    source,
    message: `Validation: ${fields}`,
    details: JSON.stringify(fieldErrors),
    userId,
    statusCode: 400,
    requestPath,
  })
}
