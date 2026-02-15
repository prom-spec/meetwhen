import Image from "next/image";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-full.svg"
                alt="letsmeet.link"
                width={140}
                height={34}
                priority
              />
            </Link>
            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-4">
              <Link
                href="/mcp"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                MCP for AI
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                About
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] px-4 py-2 rounded-lg transition-colors"
              >
                Schedule with AI
              </Link>
            </div>
            {/* Mobile hamburger */}
            <MobileNav />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-10 pb-16 text-center lg:pt-16">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-blue-50 text-[#0066FF] text-sm font-medium px-4 py-2 rounded-full">
              <span className="inline-block w-2 h-2 bg-[#0066FF] rounded-full animate-pulse" />
              Built for AI agents
            </span>
          </div>

          {/* Headline — PAS: agitate the pain, present the solution */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1a1a2e] tracking-tight">
            Stop paying $10/mo
            <br />
            <span className="text-[#0066FF]">for scheduling</span>
          </h1>
          
          {/* Tagline */}
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            The free Calendly alternative with AI chat and MCP integration. 
            3 event types free. Pro for $1/mo. Built for humans and AI agents.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors shadow-sm"
            >
              Start scheduling free →
            </Link>
            <Link
              href="/compare/calendly-vs-letsmeet"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Compare with Calendly
            </Link>
          </div>

          {/* Trust Badge */}
          <p className="mt-6 text-sm text-gray-500">
            No credit card required • Works with Google Calendar • AI chat &amp; MCP built in
          </p>
        </div>

        {/* Quick Demo Section */}
        <section className="py-16 border-t border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#1a1a2e]">See it in action</h2>
            <p className="mt-2 text-gray-600 text-sm">Your booking page + AI chat assistant, ready in 2 minutes</p>
          </div>
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
            {/* Booking page mockup */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#0066FF] rounded-full flex items-center justify-center text-white text-xs font-bold">JD</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Jane Doe</p>
                  <p className="text-xs text-gray-500">30 min consultation</p>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['M','T','W','T','F','S','S'].map((d,i) => (
                  <div key={i} className="text-center text-xs text-gray-400 font-medium">{d}</div>
                ))}
                {Array.from({length: 7}, (_, i) => (
                  <div key={i} className={`text-center text-xs py-1.5 rounded ${i === 2 ? 'bg-[#0066FF] text-white font-bold' : i > 4 ? 'text-gray-300' : 'text-gray-700 hover:bg-blue-50'}`}>
                    {i + 17}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {['9:00 AM', '10:30 AM', '2:00 PM'].map((t) => (
                  <div key={t} className={`text-xs py-2 px-3 rounded-lg border ${t === '10:30 AM' ? 'border-[#0066FF] bg-blue-50 text-[#0066FF] font-medium' : 'border-gray-200 text-gray-600'}`}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            {/* AI chat mockup */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-[#0066FF] rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900">AI Chat Assistant</p>
              </div>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-3 text-xs text-gray-700 shadow-sm">
                  Hi! I&apos;d like to book a consultation with Jane.
                </div>
                <div className="bg-[#0066FF] rounded-lg p-3 text-xs text-white ml-6">
                  Sure! Jane has openings on Wed 19th at 9:00 AM, 10:30 AM, and 2:00 PM. Which works best?
                </div>
                <div className="bg-white rounded-lg p-3 text-xs text-gray-700 shadow-sm">
                  10:30 AM please!
                </div>
                <div className="bg-[#0066FF] rounded-lg p-3 text-xs text-white ml-6">
                  ✅ Booked! Wed Feb 19, 10:30 AM. Confirmation sent to your email.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 border-t border-gray-100">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#1a1a2e]">
              AI-native scheduling, human-friendly too
            </h2>
            <p className="mt-4 text-gray-600">
              Built for AI agents from day one — but works beautifully for everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature: MCP Ready */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">MCP Ready</h3>
              <p className="text-gray-600 text-sm">
                Any AI agent can book, cancel, and manage meetings via the Model Context Protocol. Plug in and go.
              </p>
            </div>

            {/* Feature: AI Chat */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">AI Chat Built In</h3>
              <p className="text-gray-600 text-sm">
                Talk to your calendar. Set availability, check bookings, block dates — all through natural conversation.
              </p>
            </div>

            {/* Feature: Calendar Sync */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">Smart Calendar Sync</h3>
              <p className="text-gray-600 text-sm">
                Connects with Google Calendar for real-time availability. AI agents always see your true schedule.
              </p>
            </div>

            {/* Feature: Zero Back-and-Forth */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">Instant Booking</h3>
              <p className="text-gray-600 text-sm">
                Share your link, they pick a time. Or let an AI agent handle the whole thing — zero emails needed.
              </p>
            </div>
          </div>
        </section>

        {/* How AI Uses letsmeet.link */}
        <section className="py-20 border-t border-gray-100">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#1a1a2e]">
              How AI agents use letsmeet.link
            </h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Connect any MCP-compatible AI — Claude, ChatGPT, OpenClaw, or your own — and it can schedule meetings on your behalf.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              {[
                {
                  step: "1",
                  title: "Get your API key",
                  desc: "Create an API key in Settings. Takes 10 seconds.",
                },
                {
                  step: "2",
                  title: "Connect via MCP",
                  desc: "Add letsmeet.link to your AI agent's MCP config — one JSON block, done.",
                },
                {
                  step: "3",
                  title: "Let AI schedule for you",
                  desc: "\"Book a 30-min call with Sarah next week\" — your AI handles availability, booking, and confirmation.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-[#0066FF] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1a1a2e]">{item.title}</h3>
                    <p className="text-gray-600 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/mcp"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors"
              >
                Read the MCP guide →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Social Proof */}
      <section className="border-t border-gray-100 py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-6">Why people switch to letsmeet.link</p>
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-bold text-[#0066FF]">90%</p>
              <p className="text-sm text-gray-600 mt-1">cheaper than Calendly</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#0066FF]">3x</p>
              <p className="text-sm text-gray-600 mt-1">more free event types</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#0066FF]">2 min</p>
              <p className="text-sm text-gray-600 mt-1">setup time</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section with Schema */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1a1a2e] text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              { q: "Is letsmeet.link really free?", a: "Yes. The free plan includes 3 event types, AI chat scheduling, Google Calendar sync, meeting polls, email reminders, and more. No credit card required, no trial period — free forever." },
              { q: "How does letsmeet.link compare to Calendly?", a: "letsmeet.link offers 3 free event types (vs Calendly's 1), built-in AI chat scheduling, MCP integration for AI agents, and a Pro plan at $1/mo (vs Calendly's $10/mo). You get more features for 90% less." },
              { q: "What is MCP integration?", a: "MCP (Model Context Protocol) is a standard that lets AI agents interact with external tools. With letsmeet.link's MCP support, any compatible AI agent (Claude, ChatGPT, OpenClaw) can manage your calendar, book meetings, and handle scheduling automatically." },
              { q: "Can I migrate from Calendly?", a: "Yes, switching takes about 2 minutes. Sign up, set your availability, create your event types, and share your new link. Your existing Calendly bookings are unaffected." },
              { q: "What calendars do you support?", a: "Currently Google Calendar with real-time sync. Outlook/Microsoft Calendar support is coming soon." },
              { q: "Is my data secure?", a: "Absolutely. We use industry-standard encryption, secure OAuth for Google Calendar access, and never store your calendar data beyond what's needed for scheduling. See our privacy policy for details." },
            ].map((faq, i) => (
              <details key={i} className="group border border-gray-200 rounded-lg">
                <summary className="flex items-center justify-between p-5 cursor-pointer text-[#1a1a2e] font-medium">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                { "@type": "Question", name: "Is letsmeet.link really free?", acceptedAnswer: { "@type": "Answer", text: "Yes. The free plan includes 3 event types, AI chat scheduling, Google Calendar sync, meeting polls, email reminders, and more. No credit card required, no trial period — free forever." } },
                { "@type": "Question", name: "How does letsmeet.link compare to Calendly?", acceptedAnswer: { "@type": "Answer", text: "letsmeet.link offers 3 free event types (vs Calendly's 1), built-in AI chat scheduling, MCP integration for AI agents, and a Pro plan at $1/mo (vs Calendly's $10/mo). You get more features for 90% less." } },
                { "@type": "Question", name: "What is MCP integration?", acceptedAnswer: { "@type": "Answer", text: "MCP (Model Context Protocol) is a standard that lets AI agents interact with external tools. With letsmeet.link's MCP support, any compatible AI agent can manage your calendar, book meetings, and handle scheduling automatically." } },
                { "@type": "Question", name: "Can I migrate from Calendly?", acceptedAnswer: { "@type": "Answer", text: "Yes, switching takes about 2 minutes. Sign up, set your availability, create your event types, and share your new link." } },
                { "@type": "Question", name: "What calendars do you support?", acceptedAnswer: { "@type": "Answer", text: "Currently Google Calendar with real-time sync. Outlook/Microsoft Calendar support is coming soon." } },
                { "@type": "Question", name: "Is my data secure?", acceptedAnswer: { "@type": "Answer", text: "Absolutely. We use industry-standard encryption, secure OAuth for Google Calendar access, and never store your calendar data beyond what's needed for scheduling." } },
              ],
            }),
          }}
        />
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#1a1a2e] py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to schedule smarter?</h2>
          <p className="text-gray-400 mb-8">Join the next generation of scheduling. Free forever, or Pro for $1/mo.</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors"
          >
            Start scheduling free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="letsmeet.link"
                width={24}
                height={24}
              />
              <span className="text-sm text-gray-500">
                © {new Date().getFullYear()} letsmeet.link. All rights reserved.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/mcp" className="text-sm text-gray-500 hover:text-gray-700">
                MCP Guide
              </Link>
              <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-700">
                Pricing
              </Link>
              <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-700">
                Blog
              </Link>
              <Link href="/alternatives/calendly" className="text-sm text-gray-500 hover:text-gray-700">
                Calendly Alternative
              </Link>
              <Link href="/tools/meeting-cost-calculator" className="text-sm text-gray-500 hover:text-gray-700">
                Meeting Cost Calculator
              </Link>
              <Link href="/about" className="text-sm text-gray-500 hover:text-gray-700">
                About
              </Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
