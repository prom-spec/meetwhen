import { MetadataRoute } from "next";

const BASE_URL = "https://www.letsmeet.link";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    { url: BASE_URL, changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE_URL}/mcp`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  const alternatives = ["calendly", "cal-com", "tidycal", "acuity", "doodle", "savvycal"].map((slug) => ({
    url: `${BASE_URL}/alternatives/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const comparisons = ["calendly-vs-letsmeet", "cal-com-vs-letsmeet", "doodle-vs-letsmeet", "savvycal-vs-letsmeet"].map((slug) => ({
    url: `${BASE_URL}/compare/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const useCases = ["freelancers", "consultants", "coaches", "sales", "ai-agents"].map((slug) => ({
    url: `${BASE_URL}/use-cases/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const blogPosts = [
    "calendly-free-plan-isnt-free",
    "ai-powered-scheduling-setup",
    "true-cost-calendly-vs-letsmeet",
    "mcp-ai-agent-booking",
    "5-scheduling-features-you-dont-need",
  ].map((slug) => ({
    url: `${BASE_URL}/blog/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const tools = [
    { url: `${BASE_URL}/tools/meeting-cost-calculator`, changeFrequency: "monthly" as const, priority: 0.7 },
  ];

  return [
    ...staticPages,
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly" as const, priority: 0.7 },
    ...alternatives,
    ...comparisons,
    ...useCases,
    ...blogPosts,
    ...tools,
  ].map((page) => ({
    ...page,
    lastModified: new Date(),
  }));
}
