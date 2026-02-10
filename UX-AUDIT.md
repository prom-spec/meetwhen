# LetsMeet UX Audit Report

**Date:** 2026-02-09  
**Reviewer:** AI UX Reviewer  
**Compared against:** Calendly, Cal.com, SavvyCal best practices

---

## Executive Summary

LetsMeet has a solid foundation with clean visual design and good component structure. The main areas needing attention are: **error handling UX** (uses `alert()` throughout), **accessibility gaps** (missing aria labels, no focus management), **duplicate booking flows** (two competing calendar implementations), and **mobile polish** (chat widget overlap, time slot scrolling). Below are 28 findings ranked by user impact.

---

## 🔴 Critical (High Impact)

### 1. `alert()` used for all error/success feedback
**Files:** `src/app/[username]/[eventSlug]/page.tsx`, `src/app/dashboard/event-types/page.tsx`, `src/app/dashboard/availability/page.tsx`, `src/app/dashboard/event-types/new/page.tsx`  
**Problem:** Native `alert()` breaks flow, is un-styled, blocks the thread, and is inaccessible to screen readers. Used for errors ("Failed to book"), success ("Availability saved!"), and confirmations ("Link copied!").  
**Fix:** Replace with inline toast notifications. Example for the booking page:

```tsx
// Add state
const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

// Replace alert("Failed to book") with:
setToast({ type: 'error', message: error.error || 'Failed to book. Please try again.' })

// Render toast (add before closing </div>):
{toast && (
  <div
    role="alert"
    className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 animate-in fade-in slide-in-from-bottom-4 ${
      toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
    }`}
  >
    {toast.message}
  </div>
)}
```

### 2. Two competing booking flows with inconsistent UX
**Files:** `src/app/[username]/[eventSlug]/page.tsx` vs `src/app/[username]/[eventSlug]/BookingCalendar.tsx`  
**Problem:** `BookingCalendar.tsx` is a separate component with different slot format (objects with `start`/`end` vs plain strings), includes a timezone selector and notes field, but isn't actually used by the page. The page has its own inline calendar. This creates maintenance burden and inconsistency.  
**Fix:** Delete the unused `BookingCalendar.tsx` or replace the inline calendar in `page.tsx` with it. The `BookingCalendar.tsx` version is actually better because it has:
- Timezone selector (the page hardcodes guest timezone)
- Notes field
- `maxDaysAhead` support
- Better slot format with start/end times

### 3. No loading skeleton for booking page initial load
**File:** `src/app/[username]/[eventSlug]/page.tsx`  
**Problem:** The calendar renders immediately but event info shows a small pulse animation only in the left sidebar. The calendar itself has no loading state on first visit — the user sees an empty calendar with no slots until they click a date. There's no indication they *should* click a date.  
**Fix:** Add an instructional prompt and pre-select today's date:

```tsx
// In the useEffect, auto-select today on mount:
useEffect(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  setSelectedDate(today)
}, [])
```

### 4. Booking form uses `confirm()` for destructive actions
**File:** `src/app/dashboard/event-types/page.tsx` line in `handleDelete`  
**Problem:** `confirm("Are you sure you want to delete this event type?")` is a native dialog — inconsistent with the rest of the app.  
**Fix:** Use a modal like `BookingActions.tsx` already does for cancel confirmation. That pattern should be extracted into a reusable `<ConfirmDialog>` component.

---

## 🟠 Major (Medium-High Impact)

### 5. No timezone selector in primary booking flow
**File:** `src/app/[username]/[eventSlug]/page.tsx`  
**Problem:** Guest timezone is auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone` and never changeable. If someone is traveling or using a VPN, they can't correct the timezone. Calendly prominently shows timezone with a change option.  
**Fix:** Add timezone display + change link below the time slots:

```tsx
<div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
  <Globe className="w-3 h-3" />
  <span>{guestTimezone.replace(/_/g, ' ')}</span>
  <button className="text-[#0066FF] hover:underline" onClick={() => setShowTzPicker(true)}>
    Change
  </button>
</div>
```

### 6. Chat widget overlaps content on mobile
**File:** `src/components/ChatInterface.tsx`  
**Problem:** Fixed `w-96` (384px) chat widget at `bottom-4 right-4` will overflow on screens < 416px. The FAB button also overlaps booking page CTA buttons.  
**Fix:**

```tsx
// Change the open chat container:
<div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-2rem)] ...">

// Consider hiding the FAB on the public booking pages entirely
```

### 7. Dashboard nav has 7 items — too many for mobile
**File:** `src/app/dashboard/layout.tsx`  
**Problem:** 7 nav links (Dashboard, Event Types, Availability, Bookings, Teams, Analytics, Settings) in a hamburger menu is acceptable, but on desktop at `md` breakpoint (768px), they're all squeezed into a horizontal bar. Between 768-1024px, labels may overlap.  
**Fix:** The current `md:space-x-2 lg:space-x-4` helps, but consider grouping less-used items (Teams, Analytics, Settings) under a "More" dropdown at `md` breakpoint:

```tsx
// At md, show only top 4 nav items + "More" dropdown
// At lg, show all 7
```

### 8. No form validation feedback on event type creation
**File:** `src/app/dashboard/event-types/new/page.tsx`  
**Problem:** The Save button in the header calls `handleSubmit` directly (bypassing form validation). The form `onSubmit` also calls `handleSubmit`. The header button click won't trigger HTML5 validation since it's outside the `<form>`. Empty title/slug can be submitted.  
**Fix:**

```tsx
// Change the header button to submit the form:
<button
  type="submit"
  form="event-type-form" // Add id="event-type-form" to the <form>
  disabled={saving || !formData.title || !formData.slug}
  ...
>
```

### 9. No optimistic UI or loading states on dashboard actions
**Files:** `src/app/dashboard/event-types/page.tsx`, `src/app/dashboard/bookings/page.tsx`  
**Problem:** Toggling an event type's active status, deleting, or copying a link has no visual feedback (no spinner, no disabled state during the operation). Copy shows `alert("Link copied!")`.  
**Fix:** Add loading states to toggle switches and show a brief check icon for copy:

```tsx
const [copiedId, setCopiedId] = useState<string | null>(null)

const copyLink = (slug: string) => {
  navigator.clipboard.writeText(`${window.location.origin}/${username}/${slug}`)
  setCopiedId(slug)
  setTimeout(() => setCopiedId(null), 2000)
}

// In render:
<button onClick={() => copyLink(eventType.slug)}>
  {copiedId === eventType.slug ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
</button>
```

### 10. Bookings page "More" button does nothing
**File:** `src/app/dashboard/bookings/page.tsx`  
**Problem:** The `<MoreHorizontal>` button on each booking card has no `onClick` handler — it's a dead button. Users expect a dropdown with Cancel/Reschedule/View.  
**Fix:** Add a dropdown menu with actions, or link the entire card to `/booking/{id}`.

---

## 🟡 Moderate (Medium Impact)

### 11. Time slots have no date-aware empty state guidance
**File:** `src/app/[username]/[eventSlug]/page.tsx`  
**Problem:** "No available times" doesn't help the user. Could be because it's a weekend, past date, or host is busy.  
**Fix:** `<p className="text-sm text-gray-500">No times available on this day. Try another date.</p>`

### 12. Calendar doesn't indicate which dates have availability
**File:** `src/app/[username]/[eventSlug]/page.tsx`  
**Problem:** Unlike Calendly, dates aren't visually marked as having available slots. Users must click each date to discover availability — high friction.  
**Fix:** Pre-fetch the month's availability and dot-indicate available dates. This is a bigger change requiring a new API endpoint (`/api/slots/month?...`) but is the single biggest UX improvement for the booking flow.

### 13. Availability page uses `alert()` for save confirmation
**File:** `src/app/dashboard/availability/page.tsx`  
**Problem:** `alert("Availability saved!")` and `alert("Failed to save availability")`.  
**Fix:** Use the existing `hasChanges` pattern to show an inline success message. Already has the yellow "unsaved changes" banner — add a green "saved" banner.

### 14. Settings timezone has hardcoded limited options
**File:** `src/app/dashboard/settings/page.tsx`  
**Problem:** Only 12 timezone options vs `BookingCalendar.tsx` which uses `Intl.supportedValuesOf("timeZone")` (400+ options).  
**Fix:** Use the same dynamic timezone list with a searchable dropdown/combobox.

### 15. New event type page has its own layout (breaks dashboard shell)
**File:** `src/app/dashboard/event-types/new/page.tsx`  
**Problem:** This page renders its own sticky header bar outside the dashboard layout, creating a "page within a page" effect. The dashboard nav is still visible above.  
**Fix:** Remove the custom header and use the dashboard layout consistently. Move the Save button to the page content area.

### 16. No "Add to calendar" options beyond Google
**File:** `src/app/booking/[id]/page.tsx`  
**Problem:** Only "Add to Google Calendar" button. Many users use Outlook, Apple Calendar, etc.  
**Fix:** Add an `.ics` file download button as a universal fallback:

```tsx
<button
  onClick={() => {/* generate and download .ics file */}}
  className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
>
  <Calendar className="w-4 h-4" />
  Download .ics (Outlook, Apple)
</button>
```

### 17. Dashboard empty states lack illustration/motivation
**Files:** `src/app/dashboard/page.tsx`, `src/app/dashboard/event-types/page.tsx`, `src/app/dashboard/bookings/page.tsx`  
**Problem:** Empty states are plain text ("No event types yet. Create your first one!"). Calendly uses illustrations and clear CTAs.  
**Fix:** Add an icon/illustration and a prominent CTA button:

```tsx
<div className="text-center py-16 bg-white rounded-lg border border-gray-200">
  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
  <h3 className="text-lg font-semibold text-gray-900 mb-2">No event types yet</h3>
  <p className="text-gray-500 mb-6">Create your first event type to start accepting bookings</p>
  <Link href="/dashboard/event-types/new" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
    <Plus className="w-4 h-4 mr-2" />
    Create Event Type
  </Link>
</div>
```

---

## 🔵 Minor (Lower Impact, Polish)

### 18. Missing aria-labels throughout
**Files:** Multiple  
**Problem:** Calendar navigation buttons lack `aria-label`. Day buttons in calendar lack `aria-label` with full date. Toggle switches in event types lack accessible names.  
**Fix examples:**

```tsx
// Calendar nav:
<button aria-label="Previous month" onClick={...}>
<button aria-label="Next month" onClick={...}>

// Day buttons:
<button aria-label={`${monthNames[currentMonth.getMonth()]} ${day}, ${currentMonth.getFullYear()}`}>

// Toggle switch in event types:
<label className="relative inline-flex items-center cursor-pointer">
  <input type="checkbox" aria-label={`Toggle ${eventType.title} active`} .../>
```

### 19. No keyboard navigation for time slots
**File:** `src/app/[username]/[eventSlug]/page.tsx`  
**Problem:** Time slot buttons are keyboard-accessible (they're `<button>`s), but there's no visible focus ring. The `focus:ring` is missing from slot button styles.  
**Fix:** Add `focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2` to time slot buttons.

### 20. Color contrast issues on disabled calendar dates
**File:** `src/app/[username]/[eventSlug]/page.tsx`  
**Problem:** `text-gray-300` on white background has a contrast ratio of ~2.6:1, below WCAG AA minimum of 4.5:1 for text.  
**Fix:** Use `text-gray-400` (contrast ~3.9:1) or better yet `text-gray-500` with `cursor-not-allowed`.

### 21. Event type cards use `/book/[id]` URLs instead of vanity URLs
**File:** `src/app/dashboard/event-types/page.tsx`  
**Problem:** Preview and copy link use `/book/${eventType.id}` (UUID) instead of the friendly `/${username}/${eventType.slug}` URL. The slug is created but never used in the dashboard.  
**Fix:**

```tsx
const copyLink = (slug: string) => {
  navigator.clipboard.writeText(`${window.location.origin}/${username}/${slug}`)
}
// And for preview:
<a href={`/${username}/${eventType.slug}`} target="_blank" ...>
```

### 22. Loading states are plain text
**Files:** `src/app/dashboard/event-types/page.tsx`, `src/app/dashboard/bookings/page.tsx`  
**Problem:** `<div className="text-center py-10">Loading...</div>` — no spinner, no skeleton.  
**Fix:** Use skeleton loaders like the analytics page does, or at minimum add the `Loader2` spinner:

```tsx
<div className="flex justify-center py-10">
  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
</div>
```

### 23. "Powered by LetsMeet" footer repeated inconsistently
**Files:** Public pages  
**Problem:** The footer markup is copy-pasted across `[username]/page.tsx`, `[username]/[eventSlug]/page.tsx`, `booking/[id]/page.tsx` with slightly different wrappers.  
**Fix:** Extract to a `<PoweredByFooter />` component.

### 24. Login page has unused email sign-in code
**File:** `src/app/login/page.tsx`  
**Problem:** `handleEmailSignIn` function exists with full implementation, but the form isn't rendered — only Google sign-in is shown. The `emailSent` state and email input are dead code. The bottom text says "Just click Continue with Google" confirming email isn't used.  
**Fix:** Remove dead email code to reduce bundle size, or wire it up with a divider ("or sign in with email").

### 25. Booking confirmation page shows server-locale formatted dates
**File:** `src/app/booking/[id]/page.tsx`  
**Problem:** `formatDate` and `formatTime` use `toLocaleDateString(undefined, ...)` which on the server will use server locale, not the user's locale. This is a Server Component.  
**Fix:** Pass timezone from booking data and ensure client-side formatting, or use `date-fns-tz` for explicit formatting.

### 26. Mobile availability page — time selects are tiny
**File:** `src/app/dashboard/availability/page.tsx`  
**Problem:** `w-32` select boxes for start/end times on each day — on mobile, two selects + trash + plus buttons in a row is cramped. Below 640px this will overflow.  
**Fix:** Stack start/end time vertically on mobile:

```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
```

### 27. No search/filter on bookings page
**File:** `src/app/dashboard/bookings/page.tsx`  
**Problem:** Only filter is upcoming/past/all tabs. No search by guest name, email, or event type. As bookings grow, this becomes unusable.  
**Fix:** Add a search input above the tabs.

### 28. Chat widget shows on public booking pages
**File:** `src/app/dashboard/layout.tsx` → `ChatInterface`  
**Problem:** The ChatInterface is only in the dashboard layout (correct), but it's an authenticated-user-only feature that doesn't check auth state itself. If auth expires, chat API calls would fail silently.  
**Fix:** Minor — the dashboard layout already gates on auth, so this is fine. But add a check for `session` before rendering.

---

## Summary by Priority

| Priority | Count | Top Actions |
|----------|-------|-------------|
| 🔴 Critical | 4 | Replace all `alert()`/`confirm()` with inline toasts/modals; consolidate booking flows |
| 🟠 Major | 6 | Add timezone selector, fix dead "More" button, fix form validation, add mobile chat sizing |
| 🟡 Moderate | 7 | Pre-fetch month availability, improve empty states, add .ics download |
| 🔵 Minor | 11 | Aria labels, focus rings, skeleton loaders, extract shared components |

**Highest-ROI changes (do these first):**
1. Replace `alert()` with toast system (touches every page, biggest professionalism boost)
2. Add availability indicators to calendar dates (biggest booking conversion impact)
3. Add timezone selector to booking flow (prevents wrong-timezone bookings)
4. Fix the dead "More" button on bookings (broken UI = trust erosion)
5. Add focus rings + aria-labels (accessibility compliance)
