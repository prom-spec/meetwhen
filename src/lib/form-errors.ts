/**
 * Shared form error handling utilities.
 * Parses API error responses into user-friendly messages and focuses the first invalid field.
 */

// Field label mapping for user-friendly error messages
const FIELD_LABELS: Record<string, string> = {
  title: "Event Name",
  slug: "URL Slug",
  description: "Description",
  duration: "Duration",
  color: "Color",
  location: "Location",
  locationType: "Location Type",
  locationValue: "Location Details",
  bufferBefore: "Buffer Before",
  bufferAfter: "Buffer After",
  minNotice: "Minimum Notice",
  maxDaysAhead: "Max Days Ahead",
  maxBookingsPerDay: "Max Bookings Per Day",
  maxBookingsPerWeek: "Max Bookings Per Week",
  redirectUrl: "Redirect URL",
  visibility: "Visibility",
  maxAttendees: "Max Attendees",
  price: "Price",
  currency: "Currency",
  availableStartTime: "Available Start Time",
  availableEndTime: "Available End Time",
  name: "Name",
  email: "Email",
  username: "Username",
  timezone: "Timezone",
  url: "URL",
  question: "Question",
  options: "Options",
  teamId: "Team",
  cancellationPolicy: "Cancellation Policy",
  customQuestions: "Custom Questions",
  screeningQuestions: "Screening Questions",
}

interface APIErrorResponse {
  error?: string
  details?: Record<string, string[]>
  message?: string
}

/**
 * Parse an API error response into a descriptive user-facing message.
 * If field-level errors exist, returns the first one and focuses that field.
 */
export function handleFormError(
  errorData: APIErrorResponse,
  formRef?: React.RefObject<HTMLFormElement | null>
): string {
  // If we have field-level validation errors, build a descriptive message
  if (errorData.details && typeof errorData.details === "object") {
    const fieldErrors = errorData.details
    const firstField = Object.keys(fieldErrors)[0]
    const firstError = fieldErrors[firstField]?.[0]

    if (firstField && firstError) {
      // Try to focus the field
      if (formRef?.current) {
        focusField(formRef.current, firstField)
      } else {
        // Try document-level lookup
        focusField(document, firstField)
      }

      const label = FIELD_LABELS[firstField] || firstField
      return formatFieldError(label, firstError)
    }
  }

  // Fall back to the error message
  if (errorData.error && errorData.error !== "Validation failed" && errorData.error !== "Invalid input") {
    return errorData.error
  }

  return errorData.message || errorData.error || "Unable to process your request. Please check your input and try again."
}

/**
 * Focus a form field by name or data-field attribute
 */
function focusField(root: HTMLFormElement | Document, fieldName: string) {
  // Try by name attribute
  const el =
    root.querySelector<HTMLElement>(`[name="${fieldName}"]`) ||
    root.querySelector<HTMLElement>(`[data-field="${fieldName}"]`) ||
    root.querySelector<HTMLElement>(`#field-${fieldName}`) ||
    root.querySelector<HTMLElement>(`#${fieldName}`)

  if (el) {
    el.focus()
    el.scrollIntoView({ behavior: "smooth", block: "center" })

    // Add a brief red border highlight
    const prev = (el as HTMLElement).style.borderColor
    ;(el as HTMLElement).style.borderColor = "#EF4444"
    setTimeout(() => {
      ;(el as HTMLElement).style.borderColor = prev
    }, 3000)
  }
}

/**
 * Format a Zod-style error into a readable message
 */
function formatFieldError(label: string, error: string): string {
  // Common Zod error patterns → friendly messages
  if (error === "Required" || error.includes("required")) {
    return `${label} is required`
  }
  if (error.includes("too_small") || error.includes("at least")) {
    const match = error.match(/at least (\d+)/)
    return match ? `${label} must be at least ${match[1]} characters` : `${label} is too short`
  }
  if (error.includes("too_big") || error.includes("at most")) {
    const match = error.match(/at most (\d+)/)
    return match ? `${label} must be at most ${match[1]} characters` : `${label} is too long`
  }
  if (error.includes("invalid_string") || error.includes("Invalid")) {
    return `${label} is invalid`
  }
  if (error.includes("Expected number")) {
    return `${label} must be a number`
  }
  // Pass through if already readable
  if (error.length < 100) {
    return `${label}: ${error}`
  }
  return `${label} is invalid`
}
