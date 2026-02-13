# letsmeet.link — UX Copy Reference
## Feb 12, 2026 · All 11 New Features

> **Voice:** Professional but warm. Slightly playful, never corporate. Concise. Modern, AI-first, developer-friendly.

---

## 1. Contact Profiles

### /dashboard/contacts

**Page title:** Contacts  
**Section header:** Your People

**Empty state:**
> **No contacts yet**  
> People you've met with will show up here automatically. You can also add contacts manually.  
> `[+ Add Contact]`

**Search placeholder:** Search by name, email, or company…

**Button labels:**
- `+ Add Contact`
- `Import Contacts`
- `Export CSV`
- `View Profile`
- `Edit`
- `Archive`

**Tooltips:**
- Import Contacts: "Bring contacts from Google, Outlook, or CSV"
- Archive: "Remove from your active list. You can restore anytime."

**Add Contact dialog:**
- Title: **Add a Contact**
- Name field placeholder: "Jane Smith"
- Email field placeholder: "jane@company.com"
- Company field placeholder: "Acme Inc."
- Notes field placeholder: "Met at the offsite in March…"
- Help text under notes: "Only visible to you."
- `[Cancel]` `[Save Contact]`

**Toasts:**
- ✅ "Contact added."
- ✅ "Contact updated."
- ✅ "Contact archived."
- ✅ "X contacts imported."
- ❌ "Couldn't save contact. Try again?"
- ❌ "Import failed — check your file format."

**Archive confirmation:**
> **Archive this contact?**  
> They won't appear in your contacts list, but meeting history is preserved. You can restore them anytime.  
> `[Cancel]` `[Archive]`

### Contact Detail Page

**Page title:** {Contact Name}  
**Subtitle/meta:** {email} · {company}

**Section headers:**
- Overview
- Meeting History
- Activity Timeline
- Notes

**Meeting History empty state:**
> **No meetings yet**  
> When you meet with {first_name}, your shared history will appear here.

**Activity Timeline empty state:**
> **No activity yet**  
> Bookings, reschedules, and cancellations with {first_name} will show here.

**Activity timeline labels:**
- "Booked a meeting" — {date}
- "Rescheduled" — from {old_date} → {new_date}
- "Cancelled" — {date}
- "No-show" — {date}
- "Meeting completed" — {date}

**Notes placeholder:** "Add private notes about this contact…"  
**Notes help text:** "These notes are private — only you can see them."

---

## 2. Custom Webhooks

### /dashboard/settings → Webhooks section

**Section header:** Webhooks  
**Description:** Get notified in real-time when things happen — bookings, cancellations, reschedules. Push events to your own endpoints.

**Empty state:**
> **No webhooks configured**  
> Send real-time event data to any URL. Great for syncing with your CRM, Slack, or custom workflows.  
> `[+ Create Webhook]`

**Create Webhook dialog:**
- Title: **New Webhook**
- Endpoint URL placeholder: "https://your-server.com/webhooks/letsmeet"
- Help text: "We'll POST JSON to this URL whenever a selected event fires."
- **Events section header:** Which events?
  - ☐ booking.created — "A new meeting is booked"
  - ☐ booking.cancelled — "A meeting is cancelled"
  - ☐ booking.rescheduled — "A meeting time changes"
  - ☐ booking.reminder — "A reminder is sent"
  - ☐ booking.completed — "A meeting ends"
  - ☐ booking.noshow — "Attendee didn't show"
- Secret field label: "Signing secret (optional)"
- Secret help text: "We'll include an HMAC-SHA256 signature in the `X-LetsMeet-Signature` header so you can verify payloads."
- Secret placeholder: "whsec_..."
- `[Cancel]` `[Create Webhook]`

**Button labels:**
- `+ Create Webhook`
- `Edit`
- `Delete`
- `Test` (tooltip: "Send a sample event to this endpoint")
- `View Logs`
- `Disable` / `Enable`

**Toasts:**
- ✅ "Webhook created."
- ✅ "Webhook updated."
- ✅ "Webhook deleted."
- ✅ "Test event sent — check your endpoint."
- ❌ "Couldn't reach your endpoint. Got HTTP {status_code}."
- ❌ "Webhook save failed. Try again?"
- ⚠️ "This webhook has been auto-disabled after 10 consecutive failures."

**Delete confirmation:**
> **Delete this webhook?**  
> We'll stop sending events to this endpoint immediately. Delivery logs will be cleared.  
> `[Cancel]` `[Delete Webhook]`

### Delivery Logs

**Section header:** Delivery Logs  
**Description:** Recent webhook deliveries for this endpoint.

**Empty state:**
> **No deliveries yet**  
> Events will appear here once this webhook fires. Send a test to see it in action.  
> `[Send Test Event]`

**Log entry labels:**
- Status: `200 OK` / `500 Error` / `Timeout` / `Pending`
- "Delivered in {ms}ms"
- "Failed — retrying in {minutes}m"
- "Gave up after {n} attempts"

**Retry button tooltip:** "Redeliver this payload"

**Test Webhook dialog:**
- Title: **Send Test Event**
- Description: "We'll fire a sample `booking.created` event to your endpoint with fake data."
- `[Cancel]` `[Send Test]`

---

## 3. Public API

### API Key Management (/dashboard/settings → API section)

**Section header:** API Keys  
**Description:** Programmatic access to your letsmeet.link data. Build integrations, automate workflows, go wild.

**Empty state:**
> **No API keys yet**  
> Create a key to start using the letsmeet.link API. Full docs at [letsmeet.link/api-docs](/api-docs).  
> `[+ Create API Key]`

**Create API Key dialog:**
- Title: **New API Key**
- Name field label: "Key name"
- Name placeholder: "Production CRM sync"
- Help text: "Give it a name you'll recognize later."
- Permissions section: **Scopes**
  - ☐ `read:bookings` — View bookings
  - ☐ `write:bookings` — Create & modify bookings
  - ☐ `read:contacts` — View contacts
  - ☐ `write:contacts` — Create & modify contacts
  - ☐ `read:availability` — View availability
  - ☐ `write:availability` — Update availability
  - ☐ `read:webhooks` — View webhook configs
  - ☐ `write:webhooks` — Manage webhooks
- Expiry: "Expires" → `Never` / `30 days` / `90 days` / `1 year`
- `[Cancel]` `[Create Key]`

**Key reveal screen:**
> **Here's your API key**  
> Copy it now — we won't show it again.  
> `lm_live_a8f2...` `[Copy]`  
> Store it somewhere safe. Treat it like a password.  
> `[Done]`

**Toasts:**
- ✅ "API key created. Don't forget to copy it!"
- ✅ "API key revoked."
- ❌ "Couldn't create key. Try again?"

**Revoke confirmation:**
> **Revoke this API key?**  
> Any integration using this key will immediately lose access. This can't be undone.  
> `[Cancel]` `[Revoke Key]`

**Key list columns:**
- Name
- Created
- Last used (or "Never used")
- Expires (or "Never")
- Status: `Active` / `Expired` / `Revoked`

### /api-docs — Public Developer Docs

**Page title:** API Docs — letsmeet.link  
**Hero headline:** Build on letsmeet  
**Hero subtext:** RESTful. Predictable. Documented by humans (and one very thorough AI).

**Getting started section:**
> ## Quick Start
> You're three lines of code away from your first API call.
> ```bash
> curl -H "Authorization: Bearer lm_live_YOUR_KEY" \
>   https://api.letsmeet.link/v1/bookings
> ```
> That's it. You're in.

**Authentication section:**
> ## Authentication
> Pass your API key as a Bearer token. Every request. No exceptions.
> ```
> Authorization: Bearer lm_live_YOUR_KEY
> ```
> Keys live in [Dashboard → Settings → API](/dashboard/settings#api). Guard them like passwords — because they are.

**Rate limiting section:**
> ## Rate Limits
> **100 requests/minute** per key. Generous enough for real work, tight enough to keep things healthy.  
> Hit the limit? You'll get a `429`. The `Retry-After` header tells you when to try again. Don't be that client.

**Errors section header:** Errors Happen  
**Errors intro:** We use standard HTTP status codes. When something goes wrong, you'll get a JSON error body:

**API error messages:**
- `400` — "Bad request. Check your parameters — something's off."
- `401` — "Not authenticated. Missing or invalid API key."
- `403` — "Forbidden. Your key doesn't have the right scopes for this."
- `404` — "Not found. This resource doesn't exist (or you can't access it)."
- `409` — "Conflict. Someone beat you to it — the resource was modified."
- `422` — "Unprocessable. The data looks right structurally, but doesn't make sense."
- `429` — "Slow down. You've hit the rate limit. Check Retry-After."
- `500` — "Our bad. Something broke on our end. We've been notified."

**Pagination section:**
> ## Pagination
> List endpoints return 25 items by default. Use `?limit=` and `?cursor=` to page through results. The response includes `next_cursor` when there's more.

**Footer:**
> Something missing? Something broken? [Let us know](mailto:api@letsmeet.link). We read everything.

---

## 4. Team Groups

### /dashboard/teams (or /dashboard/groups)

**Page title:** Team Groups  
**Description:** Organize your team into groups for round-robin scheduling, shared availability, and easier management.

**Empty state:**
> **No groups yet**  
> Groups let you schedule meetings with a team instead of a person. Create your first group to get started.  
> `[+ Create Group]`

**Create Group dialog:**
- Title: **New Group**
- Name label: "Group name"
- Name placeholder: "Sales Team"
- Description placeholder: "Customer-facing reps, US timezone"
- Help text: "Group names are visible on your booking pages."
- Scheduling method:
  - ○ Round-robin — "Rotate meetings evenly across members"
  - ○ Collective — "Find a time when all members are free"
  - ○ Priority — "Assign to the first available member, in order"
- `[Cancel]` `[Create Group]`

**Member assignment section:**
- Header: **Members**
- Add member placeholder: "Search by name or email…"
- Empty: "No members yet. Add people to this group."
- Role labels:
  - **Group admin** — "Can edit group settings and manage members"
  - **Member** — "Included in scheduling rotation"
- Change role tooltip: "Change this person's role"
- Remove member tooltip: "Remove from group"

**Button labels:**
- `+ Create Group`
- `Add Members`
- `Edit Group`
- `Delete Group`
- `Make Admin` / `Remove Admin`
- `Remove Member`

**Toasts:**
- ✅ "Group created."
- ✅ "{name} added to {group}."
- ✅ "{name} removed from {group}."
- ✅ "Group settings updated."
- ✅ "Group deleted."
- ❌ "Couldn't update group. Try again?"

**Remove member confirmation:**
> **Remove {name} from {group}?**  
> They'll no longer receive bookings through this group. Existing meetings stay on their calendar.  
> `[Cancel]` `[Remove]`

**Delete group confirmation:**
> **Delete {group}?**  
> Active booking links for this group will stop working. Existing meetings are not affected.  
> `[Cancel]` `[Delete Group]`

---

## 5. Domain Control

### Domain Verification Flow (/dashboard/settings → Domains)

**Section header:** Custom Domains  
**Description:** Use your own domain for booking pages. Because `meet.yourcompany.com` looks better than a generic link.

**Empty state:**
> **No custom domains**  
> Connect your domain to serve booking pages from your own URL.  
> `[+ Add Domain]`

**Add Domain dialog:**
- Title: **Add a Custom Domain**
- Domain placeholder: "meet.yourcompany.com"
- Help text: "Use a subdomain like `meet.` or `book.` — we don't support root domains yet."
- `[Cancel]` `[Add Domain]`

**DNS Instructions screen:**
- Title: **Verify {domain}**
- Intro: "Add this DNS record to prove you own the domain. This usually takes a few minutes, but can take up to 48 hours to propagate."
- **Record type:** CNAME
- **Host/Name:** `{subdomain}`
- **Value/Target:** `domains.letsmeet.link`
- **TTL:** 3600 (or "Auto")
- Help: "Not sure how? Here are guides for [Cloudflare](#), [GoDaddy](#), [Namecheap](#), [Route 53](#)."
- `[Copy Record]`
- Status: `⏳ Waiting for verification…` / `✅ Verified` / `❌ Failed`
- `[Check Again]` — tooltip: "Re-check DNS records now"

**Toasts:**
- ✅ "Domain verified! {domain} is ready to use."
- ⏳ "DNS record not found yet. It can take up to 48 hours — we'll keep checking."
- ❌ "Domain verification failed. Check your DNS record and try again."
- ✅ "Domain removed."

**Remove domain confirmation:**
> **Remove {domain}?**  
> Booking pages on this domain will stop working. Links will fall back to your letsmeet.link URL.  
> `[Cancel]` `[Remove Domain]`

### Admin Oversight Dashboard

**Section header:** Domain Overview  
**Columns:** Domain · Status · Added by · SSL · Booking pages using it  
**SSL status labels:** `Active` / `Provisioning…` / `Error`

---

## 6. Org Branding Enforcement

### Brand Settings (/dashboard/settings → Branding)

**Section header:** Organization Branding  
**Description:** Set your brand defaults. These apply to all members unless overridden (or you can lock them down — you're the boss).

**Fields:**
- **Logo** — "Your logo appears on all booking pages. 400×400px minimum, PNG or SVG."
  - Upload button: `[Upload Logo]`
  - Remove: `[Remove]`
- **Brand color** — "Your primary accent color for buttons, links, and highlights."
  - Placeholder: "#4F46E5"
- **Company name** — "Shown on booking pages and email notifications."
  - Placeholder: "Acme Inc."
- **Enforce branding** toggle:
  - Label: "Lock branding for all members"
  - Help text: "When enabled, members can't customize their own booking page branding. Your org defaults apply everywhere."

**Toasts:**
- ✅ "Branding updated."
- ✅ "Branding enforcement enabled. All members now use org defaults."
- ✅ "Branding enforcement disabled. Members can customize their own."
- ❌ "Logo upload failed. Max file size is 5MB."

### "Managed by organization" states

**On member's branding settings (when locked):**
> 🔒 **Managed by your organization**  
> Your admin has enforced org-wide branding. Contact your admin to request changes.

**On booking page footer (when org-branded):**
> Scheduling by {Company Name}, powered by letsmeet.link

**On member profile settings (locked fields):**
- Tooltip on locked field: "This is set by your organization and can't be changed."

---

## 7. SCIM Group Provisioning

### Admin Settings → SCIM section

**Section header:** SCIM Provisioning  
**Description:** Automatically sync users and groups from your identity provider. Connect Okta, Azure AD, OneLogin, or any SCIM 2.0 provider.

**Empty state:**
> **SCIM not configured**  
> Connect your identity provider to automatically provision and deprovision users and groups. Less manual work, fewer mistakes.  
> `[Configure SCIM]`

**Setup flow:**
- Title: **Set Up SCIM Provisioning**
- Step 1 — "Copy these values into your identity provider:"
  - **SCIM base URL:** `https://api.letsmeet.link/scim/v2`
  - **Bearer token:** `[Generate Token]`
  - Token reveal: "Copy this now — we won't show it again."
- Step 2 — "Enable provisioning in your IdP, then click below to test the connection."
  - `[Test Connection]`

**Group provisioning description:**
> **Group Sync**  
> Groups from your identity provider are automatically mapped to letsmeet.link Team Groups. When you add or remove someone from a group in your IdP, it's reflected here within minutes.

**Status labels:**
- `Connected` — "Last sync: {time ago}"
- `Syncing…` — "Provisioning changes from your IdP"
- `Error` — "Last sync failed. Check your IdP configuration."
- `Disconnected` — "SCIM is configured but not receiving events"

**Toasts:**
- ✅ "SCIM connection verified."
- ✅ "SCIM token regenerated. Update your IdP."
- ❌ "Connection test failed. Check your IdP settings."
- ⚠️ "SCIM sync error: {error_detail}"

**Regenerate token confirmation:**
> **Regenerate SCIM token?**  
> The current token will stop working immediately. You'll need to update it in your identity provider.  
> `[Cancel]` `[Regenerate]`

**Synced group indicators (in Team Groups):**
- Badge: `Synced from IdP`
- Tooltip: "This group is managed by your identity provider. Changes should be made there."
- Attempting to edit: "This group is synced from your identity provider. Edit it in {IdP name} instead."

---

## 8. One-Off Meeting Links

### Creation Flow

**Entry point button:** `+ One-Off Link`  
**Tooltip:** "Create a single-use meeting link that expires after one booking"

**Create dialog:**
- Title: **Create a One-Off Link**
- Description: "Perfect for a single intro call or a specific conversation. The link expires after one booking."
- **Meeting title** placeholder: "Quick chat with {name}"
- **Duration** options: 15 min · 30 min · 45 min · 60 min · Custom
- **Available window:**
  - Label: "When can they book?"
  - Options: Next 7 days · Next 14 days · Next 30 days · Custom range
  - Help text: "The link will also expire if unused after this window."
- **Max uses:**
  - Label: "How many times can this be booked?"
  - Default: 1
  - Help text: "Usually 1 for one-off links, but you can allow more."
- `[Cancel]` `[Create Link]`

**Link created screen:**
> **Your link is ready**  
> Share it with whoever needs to book time with you.  
> `https://letsmeet.link/u/{slug}/one-off/{id}` `[Copy Link]`  
> This link can be used 1 time and expires {date}.  
> `[Done]`

**Toasts:**
- ✅ "One-off link created. Link copied!"
- ❌ "Couldn't create link. Try again?"

### Booking Page

**Header:** Book a time with {name}  
**Subtitle:** {meeting_title}  
**Note:** "This is a one-time link."

### Expired/Used States

**Used state:**
> **This link has been used**  
> This one-off meeting link has already been booked. If you need to schedule another time, ask {name} for a new link.

**Expired state:**
> **This link has expired**  
> The booking window for this link has closed. Reach out to {name} for a fresh link.

**Generic unavailable:**
> **Link unavailable**  
> This meeting link is no longer active. Contact the organizer for a new one.

### Dashboard — One-Off Links List

**Section header:** One-Off Links  
**Status labels:** `Active` / `Booked` / `Expired`  
**Empty state:**
> **No one-off links**  
> Create a single-use link for a specific meeting. Great for intro calls or one-time conversations.  
> `[+ One-Off Link]`

---

## 9. Share Availability from Contacts

### Personalized Link Generation

**Entry point (on contact profile):** `[Share Your Availability]`  
**Tooltip:** "Send {first_name} a personalized booking link"

**Dialog:**
- Title: **Share Availability with {name}**
- Description: "Generate a booking link personalized for {first_name}. They'll see a custom greeting when they open it."
- **Custom greeting** (optional):
  - Label: "Personal message"
  - Placeholder: "Hey {first_name}, pick a time that works for you!"
  - Help text: "This appears at the top of the booking page. Leave blank for the default."
- **Meeting type:** (dropdown of your event types)
- **Include note:** toggle
  - Label: "Let them add a note when booking"
- `[Cancel]` `[Generate Link]`

**Link ready:**
> **Personalized link for {name}**  
> `https://letsmeet.link/u/{slug}?for={contact_id}` `[Copy Link]`  
> When {first_name} opens this, they'll see your custom greeting and their name pre-filled.  
> `[Copy Link]` `[Send via Email]`

**Toasts:**
- ✅ "Personalized link created for {name}."
- ✅ "Link copied!"

### Personalized Booking Page

**Greeting (default):** "Hi {contact_first_name} 👋 — pick a time to meet with {your_name}."  
**Greeting (custom):** {user's custom message}  
**Pre-filled name field:** {contact_name} (editable)  
**Pre-filled email field:** {contact_email} (editable)  
**Help text under pre-filled fields:** "This was pre-filled from your contact info. Feel free to change it."

---

## 10. Multi-Step Reminder Workflows

### Reminder Builder UI (/dashboard/settings → Reminders or per event type)

**Section header:** Reminder Workflows  
**Description:** Set up a sequence of reminders before (or after) each meeting. Email, SMS, or webhook — your call.

**Empty state:**
> **No reminders configured**  
> Reduce no-shows with automated reminders. Set up a sequence and forget about it.  
> `[+ Create Workflow]`

**Create/Edit Workflow:**
- Title: **Reminder Workflow**
- Workflow name placeholder: "Standard reminder sequence"
- **Steps section header:** Steps
- Each step:
  - Timing: `{number}` `[minutes/hours/days]` `[before/after]` `[meeting start/meeting end]`
  - Channel: `Email` / `SMS` / `Webhook`
  - Template: (expandable text editor)
  - `[Remove Step]`
- `[+ Add Step]`
- Help text: "Steps are sent in order. If a meeting is cancelled, remaining reminders are automatically skipped."

**Timing labels (presets):**
- "24 hours before"
- "1 hour before"
- "15 minutes before"
- "5 minutes before"
- "15 minutes after" (good for follow-ups)
- "1 day after"
- Custom: "{n} {unit} {before/after} meeting {start/end}"

**Template variables help:**
> **Available variables:**
> | Variable | Description | Example |
> |---|---|---|
> | `{{attendee.name}}` | Attendee's full name | Jane Smith |
> | `{{attendee.first_name}}` | Attendee's first name | Jane |
> | `{{attendee.email}}` | Attendee's email | jane@co.com |
> | `{{meeting.title}}` | Meeting title | Product Demo |
> | `{{meeting.date}}` | Meeting date | Feb 14, 2026 |
> | `{{meeting.time}}` | Meeting time | 2:00 PM EST |
> | `{{meeting.duration}}` | Duration | 30 minutes |
> | `{{meeting.location}}` | Location or link | Zoom link |
> | `{{meeting.cancel_url}}` | Cancel link | (auto-generated) |
> | `{{meeting.reschedule_url}}` | Reschedule link | (auto-generated) |
> | `{{organizer.name}}` | Your name | Alex Chen |
> | `{{organizer.company}}` | Your company | Acme Inc. |

**Default email template placeholder:**
```
Hi {{attendee.first_name}},

Just a reminder — you have a meeting with {{organizer.name}} coming up:

📅 {{meeting.date}} at {{meeting.time}}
⏱ {{meeting.duration}}
📍 {{meeting.location}}

Need to make changes?
Reschedule: {{meeting.reschedule_url}}
Cancel: {{meeting.cancel_url}}

See you there!
```

**Button labels:**
- `+ Create Workflow`
- `+ Add Step`
- `Remove Step`
- `Save Workflow`
- `Delete Workflow`
- `Duplicate Workflow`
- `Preview` — tooltip: "See what this reminder looks like with sample data"

**Toasts:**
- ✅ "Workflow saved."
- ✅ "Workflow deleted."
- ✅ "Step added."
- ❌ "Couldn't save workflow. Check that all steps have valid timing."
- ⚠️ "This workflow has no steps. Add at least one reminder."

**Delete workflow confirmation:**
> **Delete this workflow?**  
> No more reminders will be sent for meetings using this workflow. Meetings already in progress keep their scheduled reminders.  
> `[Cancel]` `[Delete Workflow]`

---

## 11. Remove Branding Toggle

### Settings (/dashboard/settings → Appearance)

**Toggle label:** Remove letsmeet.link branding  
**Help text (Pro/paid):** "Hide the 'Powered by letsmeet.link' badge from your booking pages."

**Toggle states:**
- OFF: Booking pages show "Powered by letsmeet.link"
- ON: No letsmeet.link branding on booking pages

**Toasts:**
- ✅ "Branding removed from your booking pages."
- ✅ "letsmeet.link branding restored on your booking pages."

### Upgrade Prompt (Free users)

**When free user tries to toggle:**
> **This is a Pro feature**  
> Remove the letsmeet.link badge and make your booking pages fully yours. Available on the Pro plan.  
> `[Upgrade to Pro]` `[Maybe Later]`

**Upgrade nudge (inline, beneath locked toggle):**
> 🔒 Remove branding — `[Upgrade to Pro →]`

**On booking page (free tier):**
> Powered by [letsmeet.link](https://letsmeet.link)

**On booking page (Pro, branding removed):**
> *(nothing — clean footer)*

---

## Global Patterns

### Confirmation dialog defaults
- Destructive action button: Red, right-aligned
- Cancel: Ghost/text button, left of action
- Pattern: "Are you sure?" is banned. Be specific about what happens.

### Toast patterns
- ✅ Success: Green, auto-dismiss 4s
- ❌ Error: Red, persists until dismissed, includes retry when applicable
- ⚠️ Warning: Yellow, auto-dismiss 8s
- ℹ️ Info: Blue, auto-dismiss 4s

### Empty state pattern
1. **What this is** (bold, short)
2. **Why it matters** (one line)
3. **CTA button** to get started

### Loading states
- Skeleton screens preferred over spinners
- "Loading…" only as last resort
- For webhooks/API: "Checking…" / "Connecting…" / "Verifying…"

---

*Generated Feb 12, 2026. For letsmeet.link developer reference.*
