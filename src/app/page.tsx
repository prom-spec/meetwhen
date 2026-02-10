import Image from "next/image";
import Link from "next/link";

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
            <div className="flex items-center gap-4">
              <Link
                href="/mcp"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                MCP for AI
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
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16 text-center lg:pt-32">
          {/* Logo Icon */}
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-blue-50 rounded-2xl">
              <Image
                src="/logo.svg"
                alt="letsmeet.link icon"
                width={64}
                height={64}
              />
            </div>
          </div>

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-blue-50 text-[#0066FF] text-sm font-medium px-4 py-2 rounded-full">
              <span className="inline-block w-2 h-2 bg-[#0066FF] rounded-full animate-pulse" />
              Built for AI agents
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1a1a2e] tracking-tight">
            The scheduling platform
            <br />
            <span className="text-[#0066FF]">built for AI</span>
          </h1>
          
          {/* Tagline */}
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            AI chat built in. MCP integration ready. Any AI agent can manage your calendar, 
            book meetings, and handle scheduling — so you don&apos;t have to.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors shadow-sm"
            >
              Schedule with AI — free
            </Link>
            <Link
              href="/mcp"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Connect your AI agent
            </Link>
          </div>

          {/* Trust Badge */}
          <p className="mt-6 text-sm text-gray-500">
            Works with Claude, ChatGPT, OpenClaw, and any MCP-compatible AI • Free forever
          </p>
        </div>

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
            <div className="flex items-center gap-6">
              <Link href="/mcp" className="text-sm text-gray-500 hover:text-gray-700">
                MCP Guide
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
