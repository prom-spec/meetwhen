export interface UseCase {
  name: string;
  slug: string;
  headline: string;
  subheadline: string;
  painPoints: string[];
  solutions: { title: string; description: string }[];
  features: string[];
  cta: string;
}

export const useCases: Record<string, UseCase> = {
  freelancers: {
    name: "Freelancers",
    slug: "freelancers",
    headline: "Stop losing clients to scheduling chaos",
    subheadline: "You didn't go freelance to spend hours on back-and-forth emails. letsmeet.link handles your scheduling so you can focus on the work that pays.",
    painPoints: [
      "Endless email threads just to find a meeting time",
      "Paying $10+/mo for basic scheduling tools eats into margins",
      "Clients in different timezones make scheduling a nightmare",
      "No-shows waste your most valuable resource: time",
    ],
    solutions: [
      { title: "Share one link, done", description: "Send your booking page link. Clients pick a time that works. Zero back-and-forth." },
      { title: "AI handles the rest", description: "The built-in AI chat can answer client questions, suggest times, and confirm bookings automatically." },
      { title: "3 event types, free", description: "Discovery call, project kickoff, check-in — set up 3 event types without paying a cent." },
      { title: "Smart timezone handling", description: "Clients always see times in their timezone. No more \"wait, is that your time or mine?\"" },
    ],
    features: ["3 free event types", "AI chat scheduling", "Google Calendar sync", "Custom booking questions", "Automatic timezone detection", "Email confirmations & reminders", "Buffer time between meetings", "Custom booking page"],
    cta: "Start scheduling clients — free",
  },
  consultants: {
    name: "Consultants",
    slug: "consultants",
    headline: "Your time is billable. Stop wasting it on scheduling.",
    subheadline: "Every minute spent scheduling is a minute not billed. letsmeet.link automates your booking process so you can focus on delivering value.",
    painPoints: [
      "Scheduling admin eats 2-5 hours per week",
      "Enterprise clients expect a professional booking experience",
      "Managing multiple meeting types (discovery, strategy, review) is clunky",
      "Cancellations and reschedules create chaos",
    ],
    solutions: [
      { title: "Professional booking pages", description: "Custom-branded pages that match your consulting brand. First impressions matter." },
      { title: "Screening questions", description: "Qualify leads before they book. Ask about budget, timeline, and goals upfront." },
      { title: "Workflow automations", description: "Auto-send prep documents, follow-up emails, and feedback surveys." },
      { title: "Let AI qualify for you", description: "The AI chat can answer FAQ, guide prospects to the right meeting type, and filter out tire-kickers." },
    ],
    features: ["Screening & qualification forms", "Custom booking questions", "Workflow automations", "Email sequences", "Multiple event types", "Team scheduling", "Round-robin assignment", "Cancellation policies"],
    cta: "Automate your consulting schedule",
  },
  coaches: {
    name: "Coaches",
    slug: "coaches",
    headline: "Fill your coaching calendar without the admin work",
    subheadline: "Whether you're a life coach, executive coach, or fitness coach — letsmeet.link makes booking sessions effortless for you and your clients.",
    painPoints: [
      "Clients forget to book their next session",
      "Managing recurring sessions across multiple clients is complex",
      "You want clients to pay upfront but hate the payment setup",
      "No-shows and late cancellations hurt your income",
    ],
    solutions: [
      { title: "Recurring bookings", description: "Set up weekly or biweekly sessions that automatically repeat. Clients book once, show up every week." },
      { title: "Reminder automations", description: "Automatic email reminders reduce no-shows. Customizable timing and messaging." },
      { title: "Group coaching support", description: "Run group sessions with multiple attendees per slot. Perfect for workshops and masterminds." },
      { title: "AI booking assistant", description: "Clients can chat with AI to find the perfect session time, reschedule, or ask about your services." },
    ],
    features: ["Recurring sessions", "Group events", "Automated reminders", "Custom intake forms", "Calendar sync", "AI chat booking", "Booking page customization", "Buffer times"],
    cta: "Start booking coaching sessions — free",
  },
  sales: {
    name: "Sales Teams",
    slug: "sales",
    headline: "Book more demos. Close more deals.",
    subheadline: "Every hour a lead waits to book a demo, your close rate drops. letsmeet.link gets prospects on your calendar instantly.",
    painPoints: [
      "Leads go cold while waiting for a meeting link",
      "Round-robin assignment is manual and unfair",
      "No visibility into team booking metrics",
      "Paying $16/seat/mo for Calendly Teams adds up fast",
    ],
    solutions: [
      { title: "Instant booking links", description: "Embed booking links in emails, landing pages, and chatbots. Prospects book in seconds." },
      { title: "Smart round-robin", description: "Automatically distribute demos across your team. Fair, balanced, and configurable." },
      { title: "Routing forms", description: "Route prospects to the right rep based on company size, use case, or region." },
      { title: "AI pre-qualification", description: "The AI chat screens prospects before they book, ensuring your team only meets qualified leads." },
    ],
    features: ["Round-robin scheduling", "Routing forms", "Team management", "Screening questions", "Webhook integrations", "API access", "Custom questions", "Analytics"],
    cta: "Speed up your sales pipeline — free",
  },
  "ai-agents": {
    name: "AI Agents",
    slug: "ai-agents",
    headline: "Give your AI agent a calendar",
    subheadline: "letsmeet.link is the first scheduling platform built for AI agents. Connect via MCP and let your AI handle meeting scheduling end-to-end.",
    painPoints: [
      "AI agents can't book meetings — they just generate text",
      "Building calendar integrations from scratch is months of work",
      "No standard protocol for AI-to-calendar communication",
      "Existing scheduling tools weren't designed for programmatic access",
    ],
    solutions: [
      { title: "MCP integration", description: "Connect any MCP-compatible AI agent in minutes. One JSON config block and your AI can manage calendars." },
      { title: "Full API access", description: "REST API for everything: create event types, check availability, book meetings, manage bookings." },
      { title: "AI chat built in", description: "Even without MCP, visitors can schedule via natural language chat on any booking page." },
      { title: "Webhook events", description: "Get notified of every booking, cancellation, and reschedule. Build custom workflows around scheduling events." },
    ],
    features: ["MCP protocol support", "REST API", "AI chat on booking pages", "Webhook integrations", "API key management", "Multiple event types", "Calendar sync", "Team scheduling"],
    cta: "Connect your AI agent — free",
  },
};
