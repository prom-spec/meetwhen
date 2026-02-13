import Link from "next/link";
import Image from "next/image";
import { Check, X, Sparkles, Building2, User } from "lucide-react";

export const metadata = {
  title: "Pricing — letsmeet.link",
  description: "Simple, transparent pricing. Free for individuals, powerful for teams.",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals getting started",
    icon: User,
    cta: "Get Started Free",
    ctaHref: "/login",
    highlight: false,
    features: [
      { name: "1 event type", included: true },
      { name: "Connect 1 Google calendar", included: true },
      { name: "Unlimited bookings", included: true },
      { name: "Custom booking page", included: true },
      { name: "Google Meet integration", included: true },
      { name: "AI chat scheduling", included: true },
      { name: "Meeting polls", included: true },
      { name: "Email confirmations & reminders", included: true },
      { name: "Multiple event types", included: false },
      { name: "Multiple calendars", included: false },
      { name: "Remove branding", included: false },
      { name: "Workflows & automations", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$1",
    period: "/month",
    description: "For professionals who schedule often",
    icon: Sparkles,
    cta: "Upgrade to Pro",
    ctaHref: "/dashboard/billing",
    highlight: true,
    features: [
      { name: "Unlimited event types", included: true },
      { name: "Connect up to 6 calendars", included: true },
      { name: "Unlimited bookings", included: true },
      { name: "Custom booking page", included: true },
      { name: "Google Meet integration", included: true },
      { name: "AI chat scheduling", included: true },
      { name: "Meeting polls", included: true },
      { name: "Email confirmations & reminders", included: true },
      { name: "Multiple event types", included: true },
      { name: "Multiple Google accounts", included: true },
      { name: "Remove letsmeet.link branding", included: true },
      { name: "Workflows & automations", included: true },
      { name: "Webhooks & API access", included: true },
      { name: "Screening & qualification forms", included: true },
      { name: "Custom domain", included: true },
      { name: "Routing forms", included: true },
      { name: "Cancellation policy", included: true },
      { name: "Book on behalf of others", included: true },
      { name: "GA & Meta Pixel tracking", included: true },
      { name: "Priority support", included: true },
    ],
  },
  {
    name: "Enterprise",
    price: "$3",
    period: "/seat/month",
    description: "For teams and organizations",
    icon: Building2,
    cta: "Upgrade to Enterprise",
    ctaHref: "/dashboard/billing",
    highlight: false,
    features: [
      { name: "Everything in Pro", included: true },
      { name: "Unlimited team members", included: true },
      { name: "Round-robin scheduling", included: true },
      { name: "Team analytics & insights", included: true },
      { name: "Admin-managed event types", included: true },
      { name: "Data deletion API (GDPR)", included: true },
      { name: "Email sequence outreach", included: true },
      { name: "Dedicated account support", included: true },
      { name: "Custom embed colors", included: true },
      { name: "Group event scheduling", included: true },
      { name: "SLA guarantee", included: true },
      { name: "Onboarding & training", included: true },
    ],
  },
];

const faqs = [
  {
    q: "Is there really a free plan?",
    a: "Yes! The free plan is genuinely free forever — no credit card required. It's perfect for individuals who need basic scheduling.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Absolutely. Upgrade, downgrade, or cancel whenever you want. Changes take effect immediately.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept credit/debit cards via Lemon Squeezy. Pay yearly and save — $10/year for Pro (instead of $12), $30/year for Enterprise (instead of $36).",
  },
  {
    q: "How does the 14-day trial work?",
    a: "Pro and Enterprise plans come with a 14-day free trial. No credit card needed upfront. You'll be downgraded to Free if you don't subscribe.",
  },
  {
    q: "Why is letsmeet.link so much cheaper than Calendly?",
    a: "We're AI-native and lean. No bloated sales teams or legacy infrastructure. We pass the savings to you.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo-full.svg" alt="letsmeet.link" width={140} height={34} priority />
          </Link>
          <Link
            href="/login"
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--foreground)] mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
          AI-first scheduling shouldn&apos;t cost a fortune. Start free, upgrade when you need more.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          Up to 99% cheaper than Calendly
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.name}
                className={`rounded-2xl border-2 p-8 flex flex-col ${
                  tier.highlight
                    ? "border-[var(--primary)] shadow-lg shadow-blue-100 relative"
                    : "border-[var(--border)]"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--primary)] text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tier.highlight
                        ? "bg-[var(--primary)] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)]">{tier.name}</h3>
                </div>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-[var(--foreground)]">{tier.price}</span>
                  <span className="text-[var(--text-muted)] ml-1">{tier.period}</span>
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-6">{tier.description}</p>
                <Link
                  href={tier.ctaHref}
                  className={`block text-center py-3 px-6 rounded-lg font-medium transition-colors mb-8 ${
                    tier.highlight
                      ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                      : "bg-gray-100 text-[var(--foreground)] hover:bg-gray-200"
                  }`}
                >
                  {tier.cta}
                </Link>
                <ul className="space-y-3 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature.name} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included ? "text-[var(--foreground)]" : "text-gray-400"
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison callout */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-8">
            How we compare
          </h2>
          <div className="bg-white rounded-xl border border-[var(--border)] overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Feature</th>
                  <th className="px-6 py-4 text-sm font-bold text-[var(--primary)]">letsmeet.link Pro</th>
                  <th className="px-6 py-4 text-sm font-medium text-[var(--text-muted)]">Calendly Standard</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ["Price", "$1/mo", "$10/seat/mo"],
                  ["AI Chat Scheduling", "✅", "❌"],
                  ["MCP Integration", "✅", "❌"],
                  ["Unlimited Event Types", "✅", "✅"],
                  ["Multiple Calendars", "✅ (6)", "✅ (6)"],
                  ["Custom Domain", "✅", "❌ (Teams plan)"],
                  ["Webhooks & API", "✅", "✅"],
                  ["Remove Branding", "✅", "✅"],
                  ["Routing Forms", "✅", "❌ (Teams plan)"],
                  ["Meeting Polls", "✅", "✅"],
                  ["Screening Forms", "✅", "✅ (Standard)"],
                  ["Round-Robin", "✅ (Enterprise)", "❌ (Teams plan)"],
                  ["Email Sequence Outreach", "✅", "✅"],
                  ["GA & Meta Pixel", "✅", "❌ (Teams plan)"],
                  ["Data Deletion API", "✅", "❌ (Enterprise)"],
                  ["Cancellation Policy", "✅", "✅"],
                  ["Book for Others", "✅", "✅"],
                  ["Group Events", "✅", "✅"],
                  ["Crypto Payments", "✅", "❌"],
                ].map(([feature, us, them]) => (
                  <tr key={feature} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-6 py-3 text-[var(--foreground)]">{feature}</td>
                    <td className="px-6 py-3 font-medium">{us}</td>
                    <td className="px-6 py-3 text-[var(--text-muted)]">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-[var(--foreground)] text-center mb-8">
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="border-b border-[var(--border)] pb-6">
              <h3 className="font-semibold text-[var(--foreground)] mb-2">{faq.q}</h3>
              <p className="text-[var(--text-muted)] text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--primary)] py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to simplify scheduling?
          </h2>
          <p className="text-blue-100 mb-8">
            Join thousands of professionals who schedule smarter with AI.
          </p>
          <Link
            href="/login"
            className="inline-block bg-white text-[var(--primary)] px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} letsmeet.link. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-[var(--text-muted)]">
            <Link href="/about" className="hover:text-[var(--foreground)]">About</Link>
            <Link href="/terms" className="hover:text-[var(--foreground)]">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--foreground)]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
