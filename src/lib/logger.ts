/**
 * Centralized logging utility with timestamps
 * All logs include ISO timestamps for debugging production issues
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"

interface LogContext {
  [key: string]: unknown
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function formatMessage(level: LogLevel, category: string, message: string, context?: LogContext): string {
  const timestamp = formatTimestamp()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ""
  return `[${timestamp}] [${level}] [${category}] ${message}${contextStr}`
}

// Logger factory for different categories
export function createLogger(category: string) {
  return {
    debug(message: string, context?: LogContext) {
      if (process.env.NODE_ENV === "development" || process.env.DEBUG === "true") {
        console.log(formatMessage("DEBUG", category, message, context))
      }
    },
    info(message: string, context?: LogContext) {
      console.log(formatMessage("INFO", category, message, context))
    },
    warn(message: string, context?: LogContext) {
      console.warn(formatMessage("WARN", category, message, context))
    },
    error(message: string, error?: unknown, context?: LogContext) {
      const errorContext = error instanceof Error 
        ? { ...context, error: error.message, stack: error.stack }
        : { ...context, error: String(error) }
      console.error(formatMessage("ERROR", category, message, errorContext))
      
      // Also persist to ErrorLog table (fire-and-forget)
      try {
        import("@/lib/error-log").then(({ logError }) => {
          logError({
            source: category.toLowerCase(),
            message: `${message}: ${error instanceof Error ? error.message : String(error || "")}`.slice(0, 1000),
            details: JSON.stringify(errorContext),
            userId: context?.visitorId as string || context?.userId as string || undefined,
            requestPath: context?.requestPath as string || undefined,
          }).catch(() => {})
        }).catch(() => {})
      } catch { /* never break the caller */ }
    },
  }
}

// Pre-configured loggers for common categories
export const authLogger = createLogger("AUTH")
export const apiLogger = createLogger("API")
export const emailLogger = createLogger("EMAIL")
export const bookingLogger = createLogger("BOOKING")
export const calendarLogger = createLogger("CALENDAR")
export const webhookLogger = createLogger("WEBHOOK")

// Default export for general use
const logger = createLogger("APP")
export default logger
