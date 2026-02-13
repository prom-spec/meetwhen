import Link from "next/link";
import Image from "next/image";
import { Sparkles, Building2, User } from "lucide-react";

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
      { name: "3 event types", included: true },
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
    price: "$5",
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
    a: "We accept credit/debit cards via Lemon Squeezy. Pay yearly and save — $10/year for Pro (instead of $12), $50/year for Enterprise (instead of $60).",
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
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shrink-0 mt-[7px]" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--primary)] opacity-30 shrink-0 mt-[7px]" />
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

      {/* Comparison Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-[var(--foreground)] mb-3">
              letsmeet.link vs Calendly
            </h2>
            <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
              Same features (and more). A fraction of the price.
            </p>
          </div>

          {/* Price comparison hero cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12 mt-8">
            <div className="bg-white rounded-2xl border-2 border-[var(--primary)] p-6 text-center relative shadow-lg shadow-blue-100">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                SAVE 90%
              </div>
              <p className="text-sm font-medium text-[var(--primary)] mb-1">letsmeet.link Pro</p>
              <p className="text-5xl font-bold text-[var(--foreground)]">$1<span className="text-lg font-normal text-[var(--text-muted)]">/mo</span></p>
              <p className="text-xs text-[var(--text-muted)] mt-2">All features included · No per-seat pricing</p>
            </div>
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6 text-center opacity-75">
              <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Calendly Standard</p>
              <p className="text-5xl font-bold text-gray-400">$10<span className="text-lg font-normal text-gray-300">/seat/mo</span></p>
              <p className="text-xs text-gray-400 mt-2">Per seat · Missing AI & MCP features</p>
            </div>
          </div>

          {/* Full comparison table */}
          <div className="bg-white rounded-xl border border-[var(--border)] overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-[var(--border)]">
                  <th className="px-5 py-4 text-sm font-medium text-[var(--text-muted)] w-[30%]"></th>
                  <th className="px-4 py-4 text-center">
                    <div className="text-xs text-[var(--text-muted)] mb-0.5">letsmeet.link</div>
                    <div className="text-sm font-bold text-[var(--foreground)]">Free</div>
                    <div className="text-xs text-[var(--text-muted)]">$0</div>
                  </th>
                  <th className="px-4 py-4 text-center bg-blue-50/50">
                    <div className="text-xs text-[var(--primary)] mb-0.5">letsmeet.link</div>
                    <div className="text-sm font-bold text-[var(--primary)]">Pro</div>
                    <div className="text-xs text-[var(--primary)]">$1/mo</div>
                  </th>
                  <th className="px-4 py-4 text-center bg-blue-50/50">
                    <div className="text-xs text-[var(--primary)] mb-0.5">letsmeet.link</div>
                    <div className="text-sm font-bold text-[var(--primary)]">Enterprise</div>
                    <div className="text-xs text-[var(--primary)]">$5/seat/mo</div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">Calendly</div>
                    <div className="text-sm font-medium text-gray-500">Standard</div>
                    <div className="text-xs text-gray-400">$10/seat/mo</div>
                  </th>
                  <th className="px-4 py-4 text-center">
                    <div className="text-xs text-gray-400 mb-0.5">Calendly</div>
                    <div className="text-sm font-medium text-gray-500">Teams</div>
                    <div className="text-xs text-gray-400">$16/seat/mo</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {([
                  { category: "Scheduling" },
                  ["Unlimited event types", false, true, true, true, true],
                  ["Unlimited bookings", true, true, true, true, true],
                  ["Meeting polls", true, true, true, true, true],
                  ["Group event scheduling", false, true, true, true, true],
                  ["Round-robin scheduling", false, false, true, false, true],
                  ["Routing forms", false, true, true, false, true],
                  ["Book on behalf of others", false, true, true, true, true],
                  ["Cancellation policy", false, true, true, true, true],
                  { category: "Calendars & Integrations" },
                  ["Multiple calendars", false, true, true, true, true],
                  ["Multiple Google accounts", false, true, true, false, false],
                  ["Google Meet integration", true, true, true, true, true],
                  ["Webhooks & API access", false, true, true, true, true],
                  ["Custom domain", false, true, true, false, true],
                  ["GA & Meta Pixel tracking", false, true, true, false, true],
                  ["Custom embed colors", false, false, true, false, true],
                  { category: "AI & Automation", exclusive: true },
                  ["AI chat scheduling", true, true, true, false, false],
                  ["MCP integration", false, true, true, false, false],
                  ["Workflows & automations", false, true, true, true, true],
                  ["Screening & qualification forms", false, true, true, true, true],
                  ["Email sequence outreach", false, false, true, true, true],
                  { category: "Business & Compliance" },
                  ["Remove branding", false, true, true, true, true],
                  ["Crypto payments", false, true, true, false, false],
                  ["Data deletion API (GDPR)", false, false, true, false, false],
                  ["Team analytics & insights", false, false, true, false, true],
                  ["Admin-managed event types", false, false, true, false, true],
                  ["SLA guarantee", false, false, true, false, false],
                  ["Priority / dedicated support", false, true, true, false, false],
                ] as (
                  | { category: string; exclusive?: boolean }
                  | [string, boolean, boolean, boolean, boolean, boolean]
                )[]).map((row, i) => {
                  if ("category" in row) {
                    return (
                      <tr key={row.category} className="bg-gray-50">
                        <td colSpan={6} className="px-5 py-3 text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                          {row.category}
                          {row.exclusive && (
                            <span className="ml-2 inline-flex items-center gap-1 bg-blue-100 text-[var(--primary)] text-[10px] font-bold px-2 py-0.5 rounded-full normal-case tracking-normal">
                              <Sparkles className="w-3 h-3" /> letsmeet.link exclusive
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                  const [feature, free, pro, ent, calStd, calTeams] = row;
                  const isExclusive = pro === true && calStd === false && calTeams === false;
                  const dot = (val: boolean, isLetsmeet: boolean) => {
                    if (val && isLetsmeet) return <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] inline-block" />;
                    if (val && !isLetsmeet) return <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />;
                    return <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-200 inline-block" />;
                  };
                  return (
                    <tr
                      key={feature}
                      className={`border-b border-[var(--border)] last:border-0 ${isExclusive ? "bg-blue-50/30" : ""}`}
                    >
                      <td className="px-5 py-3 text-[var(--foreground)]">
                        {feature}
                        {isExclusive && <span className="ml-1.5 text-[10px] font-bold text-[var(--primary)] align-middle">★</span>}
                      </td>
                      <td className="px-4 py-3 text-center">{dot(free, true)}</td>
                      <td className="px-4 py-3 text-center bg-blue-50/30">{dot(pro, true)}</td>
                      <td className="px-4 py-3 text-center bg-blue-50/30">{dot(ent, true)}</td>
                      <td className="px-4 py-3 text-center">{dot(calStd, false)}</td>
                      <td className="px-4 py-3 text-center">{dot(calTeams, false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom line */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Our <strong className="text-[var(--foreground)]">$1/mo Pro</strong> includes more than Calendly Standard at <strong className="text-[var(--foreground)]">$10/seat/mo</strong>.
              Our <strong className="text-[var(--foreground)]">$5/seat/mo Enterprise</strong> beats Calendly Teams at <strong className="text-[var(--foreground)]">$16/seat/mo</strong>.
            </p>
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
