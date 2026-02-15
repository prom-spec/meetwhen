/**
 * Lightweight cookie-based A/B testing framework for letsmeet.link
 * Zero external dependencies, zero cost.
 */

// ─── Experiment Definitions ───────────────────────────────────────────────────

export interface Variant {
  id: string;
  weight: number; // relative weight (e.g. 50/50 → both 1)
  [key: string]: unknown;  // arbitrary payload per variant
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  variants: Variant[];
  active: boolean;
  startedAt: string; // ISO date
}

/**
 * All experiments defined here. Add new ones as needed.
 */
export const experiments: Experiment[] = [
  {
    id: "homepage_headline_v1",
    name: "Homepage Headline",
    description: "Test different hero headlines on the landing page",
    active: true,
    startedAt: "2026-02-15",
    variants: [
      {
        id: "control",
        weight: 1,
        headline: "Stop paying $10/mo",
        headlineAccent: "for scheduling",
        subheadline:
          "The free Calendly alternative with AI chat and MCP integration. 3 event types free. Pro for $1/mo. Built for humans and AI agents.",
      },
      {
        id: "value_prop",
        weight: 1,
        headline: "Free scheduling",
        headlineAccent: "that actually works",
        subheadline:
          "AI-powered scheduling with MCP integration. 3 event types free forever. Why pay $10/mo when you can pay $1?",
      },
    ],
  },
];

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

const COOKIE_PREFIX = "ab_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
}

// ─── Assignment ───────────────────────────────────────────────────────────────

function pickVariant(variants: Variant[]): Variant {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const v of variants) {
    rand -= v.weight;
    if (rand <= 0) return v;
  }
  return variants[variants.length - 1];
}

/**
 * Get (or assign) a variant for an experiment.
 * Returns the full Variant object with any custom payload.
 */
export function getVariant(experimentId: string): Variant | null {
  const exp = experiments.find((e) => e.id === experimentId);
  if (!exp || !exp.active) return null;

  const cookieKey = COOKIE_PREFIX + experimentId;
  const existing = getCookie(cookieKey);

  if (existing) {
    const found = exp.variants.find((v) => v.id === existing);
    if (found) return found;
  }

  // Assign new variant
  const chosen = pickVariant(exp.variants);
  setCookie(cookieKey, chosen.id);
  trackVariantAssignment(experimentId, chosen.id);
  return chosen;
}

// ─── GA4 Tracking ─────────────────────────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackVariantAssignment(experimentId: string, variantId: string) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "ab_test_assignment", {
    experiment_id: experimentId,
    variant_id: variantId,
  });
}

/**
 * Track a conversion event associated with an experiment.
 */
export function trackConversion(experimentId: string, action: string) {
  const cookieKey = COOKIE_PREFIX + experimentId;
  const variantId = getCookie(cookieKey);
  if (!variantId || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "ab_test_conversion", {
    experiment_id: experimentId,
    variant_id: variantId,
    conversion_action: action,
  });
}

// ─── Admin Helpers ────────────────────────────────────────────────────────────

export function getActiveExperiments(): Experiment[] {
  return experiments.filter((e) => e.active);
}

export function getAllExperiments(): Experiment[] {
  return experiments;
}
