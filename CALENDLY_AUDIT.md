# Calendly Feature Parity Audit — letsmeet.link

**Date:** 2026-02-11  
**Repo:** `/home/nimrod/.openclaw/workspace/projects/meetwhen`

---

## P0 — Must-Have for Launch

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | **One-on-one event types** | ✅ | `EventType` model, full CRUD in dashboard + public booking pages |
| 2 | **Availability schedules** | ✅ | `Availability` model (per-weekday), `DateOverride` for specific dates |
| 5 | **Minimum scheduling notice** | ✅ | `EventType.minNotice` (default 240 min) |
| 6 | **Date range limits** | ✅ | `EventType.maxDaysAhead` (default 60 days) |
| 9a | **Confirmation emails** | ✅ | `BookingConfirmation.tsx`, `BookingNotification.tsx` (host) |
| 9b | **Cancellation emails** | ✅ | `BookingCancellation.tsx` |
| 9c | **Reminder emails** | ✅ | `BookingReminder.tsx` + cron `send-reminders` |
| 9d | **Follow-up emails** | ✅ | `PostMeetingFollowup.tsx` + cron `post-meeting` |
| 9e | **Reschedule emails** | ✅ | `BookingReschedule.tsx`, `RescheduleRequest.tsx` |
| 10 | **Google Calendar integration** | ✅ | `src/lib/calendar.ts` — full 2-way sync, event creation, Google Meet auto-create |
| 11a | **Google Meet auto-create** | ✅ | Created via Google Calendar API conferenceData |
| 26 | **Invitee timezone detection** | ✅ | `Booking.guestTimezone`, timezone picker in BookingCalendar |
| 3 | **Buffer times (before/after)** | ✅ | `EventType.bufferBefore`, `EventType.bufferAfter` |

## P1 — Important

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 7 | **Custom questions on booking form** | ❌ | Only `notes` field exists on Booking. No custom question model or form builder. |
| 8 | **Redirect after booking** | ❌ | No `redirectUrl` field on EventType. Booking shows confirmation page only. |
| 10b | **Outlook/Microsoft Calendar** | ❌ | Only Google OAuth. No Microsoft provider or Graph API. |
| 10c | **iCloud Calendar** | ❌ | Not implemented. |
| 11b | **Zoom auto-create** | 🟡 | `LocationType.ZOOM` exists but user pastes a link manually. No Zoom OAuth or API integration to auto-create meetings. |
| 11c | **Microsoft Teams** | ❌ | Not in LocationType enum. |
| 23 | **Multiple calendar checking** | 🟡 | Checks primary Google Calendar for conflicts. No multi-account/multi-calendar checking. `linked-accounts` API exists for linking multiple Google accounts but conflict checking across them is unclear. |
| 4 | **Meeting limits (daily/weekly caps)** | ❌ | No `maxBookingsPerDay` or similar field on EventType. |
| 13 | **Embed widgets** | ✅ | `dashboard/embed/page.tsx` — inline, popup, floating modes with code generator |
| 14 | **Team scheduling (round-robin, collective)** | ✅ | `SchedulingType` enum (INDIVIDUAL, ROUND_ROBIN, COLLECTIVE), `Team`/`TeamMember` models, `src/lib/team-scheduling.ts`, dashboard pages |
| 18 | **Custom branding** | ✅ | `User.brandColor`, `User.brandLogo`, `User.hidePoweredBy` + `/api/branding` |
| 19 | **Analytics/reporting** | ✅ | Full analytics: summary, bookings over time, heatmap, funnel tracking (`PageView` model), dashboard page with charts |
| 20 | **Webhooks / API** | ✅ | `Webhook` model with deliveries, CRUD API, test endpoint. `ApiKey` model for REST API auth. |
| 30 | **Secret/private event types** | 🟡 | `EventType.isActive` toggle exists (can deactivate), but no explicit "secret link" / unlisted mode where the event is bookable via direct URL but hidden from profile. |
| 31 | **Buffer around existing calendar events** | 🟡 | Buffer before/after applies to the event type's own bookings. No separate "calendar event buffer" that adds padding around non-letsmeet events from Google Calendar. |

## P2 — Nice-to-Have

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 12 | **Payment collection (Stripe/PayPal)** | ❌ | No payment code anywhere. |
| 15 | **Routing forms** | ✅ | Full implementation: `RoutingForm`, `RoutingFormField`, `RoutingRule` models + CRUD API + dashboard page + public submission page (`/route/[id]`) |
| 16 | **Meeting polls** | ✅ | `MeetingPoll`, `PollOption`, `PollVote` models + API + dashboard (create/view/vote) + public page (`/poll/[id]`) |
| 21 | **Zapier/native integrations** | ❌ | No Zapier. Webhooks serve as the integration primitive. |
| 24 | **Recurring meetings** | ❌ | No recurrence fields on Booking or EventType. |
| 25 | **Group events (1 host, N guests same slot)** | ❌ | No `maxAttendees`/seats on EventType. Each booking is 1:1. |
| 29 | **Custom domain (CNAME)** | ❌ | Not implemented. |

## P3 — Enterprise / Later

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 17 | **Workflows/automations** | ❌ | No workflow engine. Emails are hardcoded (confirmation/reminder/followup). No custom sequences or triggers. |
| 22 | **SMS notifications** | ❌ | No Twilio or SMS code. |
| 27 | **Admin/organization management** | 🟡 | Teams exist with OWNER/ADMIN/MEMBER roles, but no org-level admin panel, billing, or user management beyond team scope. |
| 28 | **SSO/SAML** | ❌ | Only Google OAuth + email magic link. |

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Implemented | 17 |
| 🟡 Partial | 5 |
| ❌ Not implemented | 14 |

### Top Gaps (by priority for a Calendly competitor):

1. **P1: Custom booking questions** — Very common Calendly feature, easy to add (JSON field on EventType + dynamic form)
2. **P1: Outlook/Microsoft Calendar** — Blocks all Microsoft-ecosystem users
3. **P1: Meeting limits (daily/weekly)** — Simple to add, important for power users
4. **P1: Zoom OAuth auto-create** — Currently manual link only
5. **P1: Redirect after booking** — Simple field addition
6. **P2: Group events (seats)** — Common for webinars/classes
7. **P2: Payment collection** — Key monetization feature for users
8. **P2: Recurring meetings** — Frequently requested

### Unique Strengths (not in Calendly):
- **AI Chat interface** (`ChatInterface.tsx`, `/api/chat`)
- **MCP (Model Context Protocol) server** for AI agent integration
- **Holiday blocking** per country (`blockHolidays`, `holidayCountry`)
- **Account linking** (multiple Google accounts)
