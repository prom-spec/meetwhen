export interface ComparisonCategory {
  name: string;
  features: { name: string; left: string | boolean; right: string | boolean; winner: "left" | "right" | "tie" }[];
}

export interface Comparison {
  leftName: string;
  rightName: string;
  title: string;
  description: string;
  categories: ComparisonCategory[];
  verdict: string;
}

export const comparisons: Record<string, Comparison> = {
  "calendly-vs-letsmeet": {
    leftName: "Calendly",
    rightName: "letsmeet.link",
    title: "Calendly vs letsmeet.link — Full Comparison (2026)",
    description: "Detailed side-by-side comparison of Calendly and letsmeet.link. Features, pricing, AI capabilities, and more.",
    categories: [
      {
        name: "Pricing",
        features: [
          { name: "Free plan", left: "1 event type", right: "3 event types", winner: "right" },
          { name: "Pro/Standard price", left: "$10/mo", right: "$1/mo", winner: "right" },
          { name: "Team price", left: "$16/mo/seat", right: "$5/mo/seat", winner: "right" },
          { name: "Remove branding", left: "$16/mo", right: "$1/mo", winner: "right" },
        ],
      },
      {
        name: "AI & Automation",
        features: [
          { name: "AI chat scheduling", left: false, right: true, winner: "right" },
          { name: "MCP for AI agents", left: false, right: true, winner: "right" },
          { name: "Workflow automations", left: true, right: true, winner: "tie" },
          { name: "Email sequences", left: true, right: true, winner: "tie" },
        ],
      },
      {
        name: "Scheduling",
        features: [
          { name: "Booking pages", left: true, right: true, winner: "tie" },
          { name: "Meeting polls", left: "Paid", right: true, winner: "right" },
          { name: "Group events", left: true, right: true, winner: "tie" },
          { name: "Round-robin", left: "Paid", right: true, winner: "right" },
          { name: "Recurring meetings", left: true, right: true, winner: "tie" },
          { name: "Buffer times", left: true, right: true, winner: "tie" },
        ],
      },
      {
        name: "Integrations",
        features: [
          { name: "Google Calendar", left: true, right: true, winner: "tie" },
          { name: "Google Meet", left: true, right: true, winner: "tie" },
          { name: "Outlook/MS Calendar", left: true, right: "Coming soon", winner: "left" },
          { name: "Zoom", left: true, right: "Coming soon", winner: "left" },
          { name: "Stripe payments", left: true, right: "Coming soon", winner: "left" },
          { name: "Webhooks", left: true, right: true, winner: "tie" },
          { name: "API access", left: "Paid", right: true, winner: "right" },
        ],
      },
      {
        name: "Customization",
        features: [
          { name: "Custom booking questions", left: "Paid", right: true, winner: "right" },
          { name: "Screening questions", left: "Paid", right: true, winner: "right" },
          { name: "Branding colors", left: "Paid", right: true, winner: "right" },
          { name: "Custom domain", left: "Paid", right: "$1/mo", winner: "right" },
          { name: "Routing forms", left: "Paid", right: true, winner: "right" },
        ],
      },
    ],
    verdict: "letsmeet.link wins on price (90% cheaper), AI features (chat + MCP), and free plan generosity. Calendly has the edge on integrations (Outlook, Zoom) and brand recognition. If you want AI-native scheduling at a fraction of the cost, letsmeet.link is the clear choice.",
  },
  "cal-com-vs-letsmeet": {
    leftName: "Cal.com",
    rightName: "letsmeet.link",
    title: "Cal.com vs letsmeet.link — Full Comparison (2026)",
    description: "Cal.com vs letsmeet.link compared. Open source vs AI-native, self-hosted vs managed, pricing and features.",
    categories: [
      {
        name: "Pricing & Hosting",
        features: [
          { name: "Free hosted plan", left: false, right: true, winner: "right" },
          { name: "Self-hosting option", left: true, right: false, winner: "left" },
          { name: "Cloud price", left: "$12/mo", right: "$1/mo", winner: "right" },
          { name: "Open source", left: true, right: false, winner: "left" },
        ],
      },
      {
        name: "AI & Automation",
        features: [
          { name: "AI chat scheduling", left: false, right: true, winner: "right" },
          { name: "MCP for AI agents", left: false, right: true, winner: "right" },
          { name: "Workflow automations", left: true, right: true, winner: "tie" },
        ],
      },
      {
        name: "Scheduling",
        features: [
          { name: "Booking pages", left: true, right: true, winner: "tie" },
          { name: "Meeting polls", left: true, right: true, winner: "tie" },
          { name: "Group events", left: true, right: true, winner: "tie" },
          { name: "Round-robin", left: true, right: true, winner: "tie" },
          { name: "Team scheduling", left: true, right: true, winner: "tie" },
        ],
      },
      {
        name: "Setup & Ease of Use",
        features: [
          { name: "No technical setup", left: false, right: true, winner: "right" },
          { name: "Time to first booking", left: "30+ min (self-host)", right: "2 min", winner: "right" },
          { name: "Managed updates", left: "Cloud only", right: true, winner: "right" },
          { name: "Full customization", left: true, right: "Limited", winner: "left" },
        ],
      },
    ],
    verdict: "Cal.com is best for developers who want full control and don't mind self-hosting. letsmeet.link is best for everyone else — instant setup, AI-native features, and 92% cheaper than Cal.com Cloud. If you want AI scheduling without DevOps, letsmeet.link wins.",
  },
  "doodle-vs-letsmeet": {
    leftName: "Doodle",
    rightName: "letsmeet.link",
    title: "Doodle vs letsmeet.link — Full Comparison (2026)",
    description: "Doodle is great for polls but limited as a scheduling platform. See how letsmeet.link compares on features, pricing, and AI capabilities.",
    categories: [
      {
        name: "Pricing",
        features: [
          { name: "Free plan", left: "Ad-supported, limited", right: "Ad-free, 3 event types", winner: "right" },
          { name: "Pro price", left: "$6.95/mo", right: "$1/mo", winner: "right" },
          { name: "Team price", left: "$8.95/mo/seat", right: "$5/mo/seat", winner: "right" },
          { name: "Remove branding", left: "$6.95/mo", right: "$1/mo", winner: "right" },
        ],
      },
      {
        name: "AI & Automation",
        features: [
          { name: "AI chat scheduling", left: false, right: true, winner: "right" },
          { name: "MCP for AI agents", left: false, right: true, winner: "right" },
          { name: "Workflow automations", left: false, right: true, winner: "right" },
          { name: "Email sequences", left: false, right: true, winner: "right" },
        ],
      },
      {
        name: "Core Features",
        features: [
          { name: "Meeting polls", left: true, right: true, winner: "tie" },
          { name: "Booking pages", left: "Paid only", right: true, winner: "right" },
          { name: "Google Calendar sync", left: true, right: true, winner: "tie" },
          { name: "Custom booking questions", left: false, right: true, winner: "right" },
          { name: "Team scheduling", left: "Paid only", right: true, winner: "right" },
          { name: "Routing forms", left: false, right: true, winner: "right" },
          { name: "Crypto payments", left: false, right: true, winner: "right" },
        ],
      },
      {
        name: "User Experience",
        features: [
          { name: "Ad-free interface", left: "Paid only", right: true, winner: "right" },
          { name: "Mobile responsive", left: true, right: true, winner: "tie" },
          { name: "Custom branding", left: "Paid only", right: "$1/mo", winner: "right" },
          { name: "Time to first booking", left: "5 min", right: "2 min", winner: "right" },
        ],
      },
    ],
    verdict: "Doodle excels at one thing: group polling. But as a full scheduling platform, it falls short — no booking pages on the free plan, no AI, no automations, and ads everywhere. letsmeet.link gives you polls AND a complete scheduling platform with AI, for 86% less.",
  },
  "savvycal-vs-letsmeet": {
    leftName: "SavvyCal",
    rightName: "letsmeet.link",
    title: "SavvyCal vs letsmeet.link — Full Comparison (2026)",
    description: "SavvyCal offers premium UX at premium prices. See how letsmeet.link compares with AI scheduling and 92% lower pricing.",
    categories: [
      {
        name: "Pricing",
        features: [
          { name: "Free plan", left: "1 link", right: "3 event types", winner: "right" },
          { name: "Pro/Basic price", left: "$12/mo", right: "$1/mo", winner: "right" },
          { name: "Team price", left: "$20/mo/seat", right: "$5/mo/seat", winner: "right" },
          { name: "Remove branding", left: "$12/mo", right: "$1/mo", winner: "right" },
        ],
      },
      {
        name: "AI & Automation",
        features: [
          { name: "AI chat scheduling", left: false, right: true, winner: "right" },
          { name: "MCP for AI agents", left: false, right: true, winner: "right" },
          { name: "Workflow automations", left: false, right: true, winner: "right" },
          { name: "Email sequences", left: false, right: true, winner: "right" },
        ],
      },
      {
        name: "Core Features",
        features: [
          { name: "Google Calendar sync", left: true, right: true, winner: "tie" },
          { name: "Calendar overlay for recipients", left: true, right: false, winner: "left" },
          { name: "Meeting polls", left: true, right: true, winner: "tie" },
          { name: "Custom booking questions", left: true, right: true, winner: "tie" },
          { name: "Team scheduling", left: "$20/mo", right: true, winner: "right" },
          { name: "Routing forms", left: false, right: true, winner: "right" },
          { name: "Crypto payments", left: false, right: true, winner: "right" },
        ],
      },
      {
        name: "User Experience",
        features: [
          { name: "Recipient calendar overlay", left: true, right: false, winner: "left" },
          { name: "Custom branding", left: "$12/mo", right: "$1/mo", winner: "right" },
          { name: "Mobile responsive", left: true, right: true, winner: "tie" },
          { name: "Time to first booking", left: "3 min", right: "2 min", winner: "right" },
        ],
      },
    ],
    verdict: "SavvyCal has the nicest UX in scheduling — their calendar overlay is unique. But at $12-20/mo with no AI features, it's hard to justify the premium. letsmeet.link offers AI chat, MCP integration, and a full feature set at 92% less. Unless you need calendar overlay specifically, letsmeet.link is the better value.",
  },
};
