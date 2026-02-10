import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "About LetsMeet — Built in a Day with AI",
  description:
    "LetsMeet was designed, coded, and deployed in a single day by an AI agent and a human using OpenClaw.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-full.svg"
                alt="LetsMeet"
                width={140}
                height={34}
                priority
              />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] px-4 py-2 rounded-lg transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-[#0066FF] text-sm font-medium px-4 py-2 rounded-full mb-6">
            <span className="inline-block w-2 h-2 bg-[#0066FF] rounded-full animate-pulse" />
            Built in a single day
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6">
            An entire scheduling platform.
            <br />
            <span className="text-[#0066FF]">One AI. One human. One day.</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            LetsMeet isn&apos;t just a scheduling tool — it&apos;s a proof of concept for what
            happens when you give an AI agent real autonomy over a software project.
          </p>
        </div>

        {/* The Story */}
        <article className="prose prose-gray prose-lg max-w-none">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">The Story</h2>
            <p className="text-gray-600 leading-relaxed">
              LetsMeet was built using{" "}
              <a
                href="https://openclaw.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0066FF] font-medium hover:underline"
              >
                OpenClaw
              </a>
              , an AI agent platform that gives language models access to real development
              tools — terminals, browsers, file systems, APIs, and deployment pipelines.
            </p>
            <p className="text-gray-600 leading-relaxed">
              The agent behind this project is{" "}
              <span className="font-semibold text-gray-900">Promptetheus</span> — an AI
              working alongside a human operator. Together, they went from an empty
              repository to a fully deployed, production-ready scheduling platform in a
              single day.
            </p>
            <p className="text-gray-600 leading-relaxed">
              No boilerplate was copied. No templates were forked. Every line of code —
              the database schema, the API routes, the calendar UI, the email templates,
              the Google Calendar OAuth flow — was written from scratch during that session.
            </p>
          </div>

          {/* What was built */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">
              What Got Built
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  title: "Smart Scheduling",
                  desc: "Define event types with custom durations, buffers, and rolling availability windows. Bookers see only the slots that actually work.",
                },
                {
                  title: "Google Calendar Sync",
                  desc: "Two-way integration that checks your real availability and creates events automatically when bookings are confirmed.",
                },
                {
                  title: "Timezone Intelligence",
                  desc: "Automatic timezone detection for bookers with full daylight saving time handling. Everyone sees times in their own zone.",
                },
                {
                  title: "Holiday Blocking",
                  desc: "Country-specific public holidays are automatically blocked so you never get booked on a day off.",
                },
                {
                  title: "Cancel & Reschedule",
                  desc: "Full self-service flows for both organizers and attendees, with email notifications at every step.",
                },
                {
                  title: "MCP Tool Integration",
                  desc: "Exposes scheduling operations as MCP tools, so other AI agents can book, cancel, and manage meetings programmatically.",
                },
              ].map((feature) => (
                <div key={feature.title} className="flex gap-3">
                  <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-[#0066FF]" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base !mt-0 !mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-gray-500 text-sm !mt-0 leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* The point */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">
              Why This Matters
            </h2>
            <p className="text-gray-600 leading-relaxed">
              This isn&apos;t about replacing developers. It&apos;s about showing that
              the barrier between &quot;idea&quot; and &quot;shipped product&quot; is
              collapsing. A single person with the right AI tooling can build and launch
              something that would have taken a small team weeks.
            </p>
            <p className="text-gray-600 leading-relaxed">
              LetsMeet is real software used by real people. It handles edge cases, sends
              proper emails, respects timezones, and integrates with Google&apos;s OAuth
              ecosystem. The fact that it was built in a day doesn&apos;t make it a toy —
              it makes it a signal of where software development is heading.
            </p>
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="https://openclaw.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#0066FF] font-medium hover:underline text-sm"
              >
                Learn more about OpenClaw →
              </Link>
              <span className="text-gray-300 hidden sm:inline">·</span>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Try LetsMeet for free →
              </Link>
            </div>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="LetsMeet" width={24} height={24} />
              <span className="text-sm text-gray-500">
                © {new Date().getFullYear()} LetsMeet. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/about"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                About
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Privacy
              </Link>
              <Link href="#" className="text-sm text-gray-500 hover:text-gray-700">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
