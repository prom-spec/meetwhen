export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  keywords: string[];
}

export const posts: BlogPost[] = [
  {
    slug: "calendly-free-plan-isnt-free",
    title: "Why Calendly's Free Plan Isn't Really Free",
    description: "Calendly's free tier limits you to 1 event type, no integrations, and basic features. Here's what you're actually missing — and a better alternative.",
    date: "2026-02-15",
    readTime: "5 min read",
    keywords: ["calendly free plan", "calendly limitations", "calendly alternative", "free scheduling tool"],
  },
  {
    slug: "ai-powered-scheduling-setup",
    title: "How to Set Up AI-Powered Scheduling in 2 Minutes",
    description: "Connect your AI agent to your calendar using MCP. Step-by-step guide to automated scheduling with letsmeet.link.",
    date: "2026-02-15",
    readTime: "4 min read",
    keywords: ["ai scheduling", "mcp scheduling", "ai agent calendar", "automated scheduling"],
  },
  {
    slug: "true-cost-calendly-vs-letsmeet",
    title: "The True Cost of Calendly vs letsmeet.link",
    description: "A detailed pricing breakdown: what you actually pay for Calendly vs letsmeet.link over 1 year. Spoiler: you save over $100.",
    date: "2026-02-15",
    readTime: "6 min read",
    keywords: ["calendly pricing", "calendly cost", "scheduling tool pricing", "calendly vs letsmeet"],
  },
];
