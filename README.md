# MeetWhen

A modern, open-source scheduling application built with Next.js 16 — similar to Calendly.

## Features

- **Event Types**: Create customizable meeting types with different durations, buffers, and settings
- **Availability Management**: Set your weekly availability with custom hours per day
- **Date Overrides**: Block specific dates or set custom hours for holidays/special days
- **Google Calendar Integration**: Automatically syncs bookings and checks for conflicts
- **Public Booking Pages**: Share your scheduling link (`/username/event-slug`)
- **AI Assistant**: Built-in chat assistant to help manage your schedule
- **MCP Server**: Model Context Protocol server for AI agent integrations

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS
- **Email**: Resend (or SMTP)
- **AI**: Cloudflare Workers AI

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/prom-spec/meetwhen.git
   cd meetwhen
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (see Environment Variables below).

4. Set up the database:
   ```bash
   pnpm db:push
   ```

5. Run the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Your app's URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Yes | Random secret for NextAuth.js |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `RESEND_API_KEY` | No | Resend API key for emails |
| `EMAIL_FROM` | No | Sender email address |
| `CLOUDFLARE_ACCOUNT_ID` | No | For AI chat assistant |
| `CLOUDFLARE_AI_TOKEN` | No | For AI chat assistant |
| `MCP_USER_ID` | No | User ID for MCP server |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Request the following scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm mcp` | Start MCP server for AI integrations |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── [username]/         # Public booking pages
│   ├── api/                # API routes
│   ├── dashboard/          # Authenticated dashboard
│   └── login/              # Login page
├── components/             # React components
├── lib/                    # Utilities and configurations
│   ├── auth.ts             # NextAuth configuration
│   ├── calendar.ts         # Google Calendar integration
│   ├── prisma.ts           # Prisma client
│   └── slots.ts            # Time slot calculations
├── emails/                 # Email templates
└── mcp/                    # MCP server for AI agents
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/*` | * | NextAuth.js authentication |
| `/api/availability` | GET, POST | Manage weekly availability |
| `/api/bookings` | GET, POST | List and create bookings |
| `/api/date-overrides` | GET, POST, DELETE | Manage date overrides |
| `/api/event-types` | GET, POST | List and create event types |
| `/api/event-types/[id]` | GET, PATCH, DELETE | Manage single event type |
| `/api/slots` | GET | Get available time slots |
| `/api/chat` | POST | AI chat assistant |

## MCP Server

MeetWhen includes an MCP (Model Context Protocol) server for AI agent integrations. Start it with:

```bash
pnpm mcp
```

Available tools:
- `get_event_types` - List configured event types
- `get_availability` - Get weekly availability
- `get_bookings` - Get upcoming bookings
- `create_booking` - Book a new meeting
- `cancel_booking` - Cancel an existing booking

## License

MIT
