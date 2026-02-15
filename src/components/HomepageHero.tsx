"use client";

import { useExperiment } from "@/hooks/useExperiment";

const DEFAULTS = {
  headline: "Stop paying $10/mo",
  headlineAccent: "for scheduling",
  subheadline:
    "The free Calendly alternative with AI chat and MCP integration. 3 event types free. Pro for $1/mo. Built for humans and AI agents.",
};

export function HomepageHero() {
  const variant = useExperiment("homepage_headline_v1");

  const headline = (variant?.headline as string) || DEFAULTS.headline;
  const headlineAccent = (variant?.headlineAccent as string) || DEFAULTS.headlineAccent;
  const subheadline = (variant?.subheadline as string) || DEFAULTS.subheadline;

  return (
    <>
      {/* Badge */}
      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center gap-2 bg-blue-50 text-[#0066FF] text-sm font-medium px-4 py-2 rounded-full">
          <span className="inline-block w-2 h-2 bg-[#0066FF] rounded-full animate-pulse" />
          Built for AI agents
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1a1a2e] tracking-tight">
        {headline}
        <br />
        <span className="text-[#0066FF]">{headlineAccent}</span>
      </h1>

      {/* Tagline */}
      <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
        {subheadline}
      </p>
    </>
  );
}
