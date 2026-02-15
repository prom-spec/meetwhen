"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import MobileNav from "@/components/MobileNav";

export default function MeetingCostCalculator() {
  const [attendees, setAttendees] = useState(5);
  const [hourlyRate, setHourlyRate] = useState(50);
  const [duration, setDuration] = useState(30);
  const [meetingsPerWeek, setMeetingsPerWeek] = useState(10);

  const costs = useMemo(() => {
    const costPerMeeting = attendees * hourlyRate * (duration / 60);
    const weekly = costPerMeeting * meetingsPerWeek;
    const monthly = weekly * 4.33;
    const yearly = weekly * 52;
    const schedulingWaste = yearly * 0.15; // 15% of meeting time wasted on scheduling
    return { costPerMeeting, weekly, monthly, yearly, schedulingWaste };
  }, [attendees, hourlyRate, duration, meetingsPerWeek]);

  const fmt = (n: number) =>
    n >= 1000
      ? `$${Math.round(n).toLocaleString()}`
      : `$${n.toFixed(0)}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="letsmeet.link" width={28} height={28} />
            <span className="font-semibold text-lg">letsmeet.link</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900">Blog</Link>
            <Link href="/login" className="text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] px-4 py-2 rounded-lg transition-colors">
              Get Started Free
            </Link>
          </div>
          <MobileNav />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            💸 Meeting Cost Calculator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            How much do meetings actually cost your team? The number might shock you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Inputs */}
          <div className="space-y-6 bg-gray-50 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900">Your meetings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attendees per meeting: <span className="text-[#0066FF] font-bold">{attendees}</span>
              </label>
              <input type="range" min={2} max={20} value={attendees} onChange={(e) => setAttendees(+e.target.value)}
                className="w-full accent-[#0066FF]" />
              <div className="flex justify-between text-xs text-gray-400"><span>2</span><span>20</span></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avg. hourly rate: <span className="text-[#0066FF] font-bold">${hourlyRate}</span>
              </label>
              <input type="range" min={20} max={200} step={5} value={hourlyRate} onChange={(e) => setHourlyRate(+e.target.value)}
                className="w-full accent-[#0066FF]" />
              <div className="flex justify-between text-xs text-gray-400"><span>$20</span><span>$200</span></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration: <span className="text-[#0066FF] font-bold">{duration} min</span>
              </label>
              <input type="range" min={15} max={120} step={15} value={duration} onChange={(e) => setDuration(+e.target.value)}
                className="w-full accent-[#0066FF]" />
              <div className="flex justify-between text-xs text-gray-400"><span>15m</span><span>2h</span></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meetings per week: <span className="text-[#0066FF] font-bold">{meetingsPerWeek}</span>
              </label>
              <input type="range" min={1} max={40} value={meetingsPerWeek} onChange={(e) => setMeetingsPerWeek(+e.target.value)}
                className="w-full accent-[#0066FF]" />
              <div className="flex justify-between text-xs text-gray-400"><span>1</span><span>40</span></div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
              <p className="text-sm text-red-600 font-medium mb-1">Your meetings cost per year</p>
              <p className="text-4xl sm:text-5xl font-bold text-red-600">{fmt(costs.yearly)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Per meeting</p>
                <p className="text-xl font-bold text-gray-900">{fmt(costs.costPerMeeting)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Per week</p>
                <p className="text-xl font-bold text-gray-900">{fmt(costs.weekly)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Per month</p>
                <p className="text-xl font-bold text-gray-900">{fmt(costs.monthly)}</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                <p className="text-xs text-orange-600 mb-1">Wasted on scheduling</p>
                <p className="text-xl font-bold text-orange-600">{fmt(costs.schedulingWaste)}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mt-4">
              <p className="text-sm text-gray-700 mb-3">
                <strong>~15% of meeting time</strong> is wasted on back-and-forth scheduling emails.
                That&apos;s <span className="text-[#0066FF] font-bold">{fmt(costs.schedulingWaste)}/year</span> you could save with proper scheduling tools.
              </p>
              <Link href="/login" className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors">
                Stop wasting time → Try letsmeet.link free
              </Link>
            </div>

            <p className="text-xs text-gray-400 text-center mt-2">
              Based on {attendees} people × ${hourlyRate}/hr × {duration}min × {meetingsPerWeek}/week × 52 weeks
            </p>
          </div>
        </div>

        {/* SEO Content */}
        <section className="mt-16 prose prose-gray max-w-none">
          <h2>Why meeting costs matter</h2>
          <p>
            The average professional spends <strong>31 hours per month</strong> in unproductive meetings (Atlassian).
            That&apos;s nearly 4 full workdays lost to meetings that could have been emails — or at least shorter.
          </p>
          <p>
            Scheduling itself is a hidden tax. The back-and-forth emails trying to find a time that works for everyone
            wastes an estimated 15-20% of total meeting-related time. For a team of 10, that adds up to thousands of
            dollars per year in lost productivity.
          </p>

          <h2>How to reduce meeting costs</h2>
          <ol>
            <li><strong>Use scheduling links</strong> — Eliminate the email ping-pong. Tools like <Link href="/">letsmeet.link</Link> let people book directly into your available slots.</li>
            <li><strong>Set default durations to 25 minutes</strong> — Meetings expand to fill the time given. A 25-minute default forces focus.</li>
            <li><strong>Require agendas</strong> — No agenda, no meeting. Use booking questions to collect context upfront.</li>
            <li><strong>Let AI handle scheduling</strong> — <Link href="/blog/ai-powered-scheduling-setup">AI-powered scheduling</Link> removes humans from the loop entirely.</li>
          </ol>

          <h2>The cheapest scheduling tool that actually works</h2>
          <p>
            Most scheduling tools charge $10-16/month per user. <Link href="/pricing">letsmeet.link</Link> is free for
            up to 3 event types, and just $1/month for unlimited everything. That&apos;s 90% cheaper than{" "}
            <Link href="/alternatives/calendly">Calendly</Link> and includes features like AI chat scheduling and{" "}
            <Link href="/mcp">MCP integration</Link> that no competitor offers.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="letsmeet.link" width={24} height={24} />
              <span className="text-sm text-gray-500">© {new Date().getFullYear()} letsmeet.link</span>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-700">Blog</Link>
              <Link href="/alternatives/calendly" className="text-sm text-gray-500 hover:text-gray-700">Calendly Alternative</Link>
              <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-700">Pricing</Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
