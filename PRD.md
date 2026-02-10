# LetsMeet - Product Requirements Document

## Overview
A full-featured scheduling application similar to Calendly, allowing users to share their availability and let others book meetings with them.

## Tech Stack
- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Authentication:** NextAuth.js (Google OAuth + Email magic links)
- **Email:** Nodemailer / Resend
- **Deployment:** TBD (needs serverless support)

---

## Core Features (MVP)

### 1. User Authentication
- [ ] Sign up / Sign in with Google OAuth
- [ ] Sign up / Sign in with magic email links
- [ ] User profile (name, avatar, timezone)
- [ ] Account settings

### 2. Event Types
- [ ] Create event types (e.g., "30 min meeting", "1 hour consultation")
- [ ] Configure duration (15, 30, 45, 60, 90, 120 min, custom)
- [ ] Set title, description, location (Zoom/Meet link, phone, custom)
- [ ] Color coding for visual organization
- [ ] Enable/disable event types
- [ ] Shareable public link per event type

### 3. Availability Management
- [ ] Set weekly recurring availability (e.g., Mon-Fri 9am-5pm)
- [ ] Override specific dates (vacation, holidays)
- [ ] Set timezone (auto-detect + manual override)
- [ ] Buffer time between meetings (before/after)
- [ ] Minimum scheduling notice (e.g., 4 hours in advance)
- [ ] Maximum days in advance (e.g., 60 days)
- [ ] Daily meeting limits

### 4. Booking Flow (Public Page)
- [ ] Public booking page: `/{username}/{event-slug}`
- [ ] Calendar view showing available slots
- [ ] Timezone selector for booker
- [ ] Booking form (name, email, optional fields)
- [ ] Confirmation page with meeting details
- [ ] Add to calendar buttons (Google, Outlook, iCal)

### 5. Calendar Integration
- [ ] Google Calendar sync (read busy times, write events)
- [ ] Outlook/O365 Calendar sync (future)
- [ ] Detect conflicts automatically

### 6. Notifications
- [ ] Email confirmation to booker
- [ ] Email notification to host
- [ ] Reminder emails (24h, 1h before - configurable)
- [ ] Cancellation/reschedule notifications

### 7. Booking Management
- [ ] Dashboard showing upcoming meetings
- [ ] Past meetings history
- [ ] Cancel meeting
- [ ] Reschedule meeting
- [ ] Add meeting notes

---

## Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  username      String?   @unique
  timezone      String    @default("UTC")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  eventTypes    EventType[]
  bookings      Booking[]   @relation("host")
  availability  Availability[]
  accounts      Account[]
  sessions      Session[]
}

model EventType {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  
  title         String
  slug          String
  description   String?
  duration      Int       // minutes
  color         String    @default("#3B82F6")
  location      String?   // "zoom", "google_meet", "phone", custom URL
  isActive      Boolean   @default(true)
  
  bufferBefore  Int       @default(0)  // minutes
  bufferAfter   Int       @default(0)  // minutes
  minNotice     Int       @default(240) // 4 hours in minutes
  maxDaysAhead  Int       @default(60)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  bookings      Booking[]
  
  @@unique([userId, slug])
}

model Availability {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  
  dayOfWeek     Int       // 0-6 (Sunday-Saturday)
  startTime     String    // "09:00"
  endTime       String    // "17:00"
  
  @@unique([userId, dayOfWeek, startTime])
}

model DateOverride {
  id            String    @id @default(cuid())
  userId        String
  date          DateTime  @db.Date
  isAvailable   Boolean   @default(false)
  startTime     String?
  endTime       String?
  
  @@unique([userId, date])
}

model Booking {
  id            String    @id @default(cuid())
  eventTypeId   String
  eventType     EventType @relation(fields: [eventTypeId], references: [id])
  
  hostId        String
  host          User      @relation("host", fields: [hostId], references: [id])
  
  guestName     String
  guestEmail    String
  guestTimezone String
  
  startTime     DateTime
  endTime       DateTime
  
  status        BookingStatus @default(CONFIRMED)
  notes         String?
  
  googleEventId String?   // for calendar sync
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

// NextAuth models
model Account { ... }
model Session { ... }
model VerificationToken { ... }
```

---

## Page Structure

```
/                           # Landing page (marketing)
/login                      # Login page
/signup                     # Signup page

/dashboard                  # User dashboard (upcoming meetings)
/dashboard/event-types      # Manage event types
/dashboard/availability     # Set availability
/dashboard/bookings         # All bookings
/dashboard/settings         # Account settings

/{username}                 # Public profile (list event types)
/{username}/{event-slug}    # Public booking page
/{username}/{event-slug}/book?date=...&time=...  # Booking form
/booking/{bookingId}        # Booking confirmation/details
/booking/{bookingId}/cancel # Cancel booking
/booking/{bookingId}/reschedule # Reschedule
```

---

## API Routes

```
POST   /api/auth/*           # NextAuth
GET    /api/user             # Get current user
PATCH  /api/user             # Update user profile
GET    /api/event-types      # List user's event types
POST   /api/event-types      # Create event type
GET    /api/event-types/[id] # Get event type
PATCH  /api/event-types/[id] # Update event type
DELETE /api/event-types/[id] # Delete event type
GET    /api/availability     # Get availability settings
POST   /api/availability     # Set availability
GET    /api/bookings         # List bookings
POST   /api/bookings         # Create booking (public)
GET    /api/bookings/[id]    # Get booking details
PATCH  /api/bookings/[id]    # Update booking (cancel/reschedule)
GET    /api/slots            # Get available slots for event type
```

---

## Development Phases

### Phase 1: Foundation (MVP Core)
1. Project setup (Next.js, Prisma, Tailwind)
2. Database schema + Neon connection
3. Authentication (NextAuth with Google)
4. User profile & settings

### Phase 2: Event Types & Availability
5. Event type CRUD
6. Availability management UI
7. Time slot calculation logic

### Phase 3: Booking Flow
8. Public booking pages
9. Calendar slot picker component
10. Booking form & confirmation
11. Email notifications

### Phase 4: Dashboard & Management
12. Dashboard with upcoming meetings
13. Booking management (cancel, reschedule)
14. Past bookings history

### Phase 5: Polish & Integrations
15. Google Calendar sync
16. Reminder emails
17. Mobile responsive design
18. Performance optimization

---

## Success Metrics
- User can sign up and create an event type in < 3 minutes
- Booking flow completes in < 1 minute
- Page load times < 2 seconds
- Mobile-friendly (responsive design)

---

## Out of Scope (v1)
- Team/organization features
- Round robin scheduling
- Group events
- Payment integration
- Custom branding/white-label
- Webhooks/API for external integrations
- Meeting polls
- Routing forms

---

## Timeline Estimate
- Phase 1: 4-6 hours
- Phase 2: 4-6 hours
- Phase 3: 6-8 hours
- Phase 4: 4-6 hours
- Phase 5: 4-6 hours
- **Total: ~24-32 hours of dev work**

With parallel coding agents, target completion: 8-12 hours elapsed time.
