"use client"

import { memo } from "react"
import { Repeat } from "lucide-react"

interface ScreeningQuestion {
  id: string
  label: string
  type: "text" | "select" | "checkbox"
  required: boolean
  options?: string[]
}

interface BookingFormProps {
  eventTitle: string
  selectedDate: Date
  selectedTime: string
  guestTimezone: string
  accentColor: string
  isLoading: boolean
  formData: {
    name: string
    email: string
    notes: string
    recurrenceRule: string
  }
  onFormChange: (data: { name: string; email: string; notes: string; recurrenceRule: string }) => void
  screeningAnswers: Record<string, string>
  onScreeningChange: (answers: Record<string, string>) => void
  screeningQuestions: string | null
  bookForOther: boolean
  onBookForOtherChange: (v: boolean) => void
  bookerName: string
  onBookerNameChange: (v: string) => void
  bookerEmail: string
  onBookerEmailChange: (v: string) => void
  allowRecurring: boolean
  recurrenceOptions: string | null
  onSubmit: (e: React.FormEvent) => void
  onBack: () => void
}

const RECURRENCE_LABELS: Record<string, string> = {
  weekly_4: "Weekly × 4 (1 month)",
  weekly_8: "Weekly × 8 (2 months)",
  biweekly_4: "Biweekly × 4 (2 months)",
  monthly_3: "Monthly × 3 (3 months)",
}

export default memo(function BookingForm({
  eventTitle,
  selectedDate,
  selectedTime,
  guestTimezone,
  accentColor,
  isLoading,
  formData,
  onFormChange,
  screeningAnswers,
  onScreeningChange,
  screeningQuestions,
  bookForOther,
  onBookForOtherChange,
  bookerName,
  onBookerNameChange,
  bookerEmail,
  onBookerEmailChange,
  allowRecurring,
  recurrenceOptions,
  onSubmit,
  onBack,
}: BookingFormProps) {
  let questions: ScreeningQuestion[] = []
  if (screeningQuestions) {
    try { questions = JSON.parse(screeningQuestions) } catch { /* ignore */ }
  }

  let recurrenceOpts: string[] = []
  if (allowRecurring && recurrenceOptions) {
    try { recurrenceOpts = JSON.parse(recurrenceOptions) } catch { /* ignore */ }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="text-sm mb-4 font-medium"
        style={{ color: accentColor }}
      >
        ← Change time
      </button>
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="font-semibold text-[#1a1a2e]">{eventTitle}</p>
        <p className="text-sm text-gray-600 mt-1">
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          {" at "}{selectedTime}
        </p>
        <p className="text-xs text-gray-500 mt-1">{guestTimezone.replace(/_/g, " ")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-shadow"
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-shadow"
            placeholder="john@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-shadow resize-none"
            placeholder="Share anything that will help prepare for the meeting..."
          />
        </div>

        {/* Screening Questions */}
        {questions.length > 0 && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700">Screening Questions</p>
            {questions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm text-gray-700 mb-1">
                  {q.label} {q.required && <span className="text-red-500">*</span>}
                </label>
                {q.type === "text" && (
                  <input
                    type="text"
                    required={q.required}
                    value={screeningAnswers[q.id] || ""}
                    onChange={(e) => onScreeningChange({ ...screeningAnswers, [q.id]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                  />
                )}
                {q.type === "select" && q.options && (
                  <select
                    required={q.required}
                    value={screeningAnswers[q.id] || ""}
                    onChange={(e) => onScreeningChange({ ...screeningAnswers, [q.id]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0066FF] focus:border-transparent bg-white"
                  >
                    <option value="">Select...</option>
                    {q.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {q.type === "checkbox" && (
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={!!screeningAnswers[q.id]}
                      onChange={(e) => onScreeningChange({ ...screeningAnswers, [q.id]: e.target.checked ? "yes" : "" })}
                      className="rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]"
                    />
                    Yes
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Book on behalf */}
        <div className="border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bookForOther}
              onChange={(e) => onBookForOtherChange(e.target.checked)}
              className="rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]"
            />
            <span className="text-sm text-gray-700">Book for someone else</span>
          </label>
          {bookForOther && (
            <div className="mt-3 space-y-3 pl-6">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Your name (booker) *</label>
                <input
                  type="text"
                  required
                  value={bookerName}
                  onChange={(e) => onBookerNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Your email (booker) *</label>
                <input
                  type="email"
                  required
                  value={bookerEmail}
                  onChange={(e) => onBookerEmailChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
              <p className="text-xs text-gray-400">
                Both you and the attendee above will receive confirmation emails.
              </p>
            </div>
          )}
        </div>

        {/* Recurrence */}
        {recurrenceOpts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Repeat className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Recurring
            </label>
            <select
              value={formData.recurrenceRule}
              onChange={(e) => onFormChange({ ...formData, recurrenceRule: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-shadow bg-white"
            >
              <option value="">One-time meeting</option>
              {recurrenceOpts.map((opt) => (
                <option key={opt} value={opt}>{RECURRENCE_LABELS[opt] || opt}</option>
              ))}
            </select>
            {formData.recurrenceRule && (
              <p className="text-xs text-gray-500 mt-1">
                This will book multiple meetings on the same day/time
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
          style={{ backgroundColor: accentColor }}
        >
          {isLoading ? "Booking..." : formData.recurrenceRule ? "Confirm Recurring Booking" : "Confirm Booking"}
        </button>
      </form>
    </div>
  )
})
