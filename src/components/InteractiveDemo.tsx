"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type DemoVariant =
  | "booking"       // Standard booking flow
  | "ai-chat"       // AI chat scheduling
  | "comparison"    // Side-by-side old vs new
  | "calculator"    // Quick savings calc
  | "team";         // Team/round-robin

interface InteractiveDemoProps {
  variant?: DemoVariant;
  /** Competitor name for comparison variant */
  competitor?: string;
  /** Use case context for tailored copy */
  persona?: string;
  /** Compact mode for tighter layouts */
  compact?: boolean;
}

// ─── Booking Flow Demo ─────────────────────────────────────────────────
function BookingDemo({ persona, compact }: { persona?: string; compact?: boolean }) {
  const [step, setStep] = useState(0); // 0=calendar, 1=time, 2=confirm, 3=done
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const personaLabel = persona || "Quick Chat";
  const days = [17, 18, 19, 20, 21];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const times = ["9:00 AM", "11:00 AM", "2:30 PM", "4:00 PM"];

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setStep(1);
  };

  const handleTimeClick = (time: string) => {
    setSelectedTime(time);
    setAnimating(true);
    setTimeout(() => {
      setStep(2);
      setAnimating(false);
    }, 400);
  };

  const handleConfirm = () => {
    setAnimating(true);
    setTimeout(() => {
      setStep(3);
      setAnimating(false);
    }, 600);
  };

  const handleReset = () => {
    setStep(0);
    setSelectedDay(null);
    setSelectedTime(null);
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${compact ? "max-w-sm" : "max-w-md"} mx-auto`}>
      {/* Header */}
      <div className="bg-[#0066FF] px-5 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-xs font-bold">
          JD
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Jane Doe</p>
          <p className="text-white/70 text-xs">{personaLabel} · 30 min</p>
        </div>
        <div className="ml-auto">
          <span className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full">letsmeet.link</span>
        </div>
      </div>

      <div className="p-5">
        {/* Step 0: Pick a day */}
        {step === 0 && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <p className="text-xs text-gray-500 mb-3 font-medium">Pick a day</p>
            <div className="flex gap-2">
              {days.map((d, i) => (
                <button
                  key={d}
                  onClick={() => handleDayClick(d)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 hover:border-[#0066FF] hover:bg-blue-50 transition-all text-center group cursor-pointer"
                >
                  <span className="block text-[10px] text-gray-400 group-hover:text-[#0066FF]">{dayNames[i]}</span>
                  <span className="block text-sm font-semibold text-gray-700 group-hover:text-[#0066FF]">{d}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Pick a time */}
        {step === 1 && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <button onClick={() => setStep(0)} className="text-xs text-[#0066FF] mb-3 hover:underline cursor-pointer">← Back to dates</button>
            <p className="text-xs text-gray-500 mb-3 font-medium">Feb {selectedDay} — Pick a time</p>
            <div className="grid grid-cols-2 gap-2">
              {times.map((t) => (
                <button
                  key={t}
                  onClick={() => handleTimeClick(t)}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                    animating && selectedTime === t
                      ? "border-[#0066FF] bg-[#0066FF] text-white scale-95"
                      : "border-gray-200 text-gray-700 hover:border-[#0066FF] hover:text-[#0066FF]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.3s_ease-out] text-center py-2">
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500">Your booking</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{personaLabel} with Jane Doe</p>
              <p className="text-sm text-[#0066FF] font-medium">Feb {selectedDay} at {selectedTime}</p>
              <p className="text-xs text-gray-400 mt-1">30 minutes · Google Meet</p>
            </div>
            <button
              onClick={handleConfirm}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                animating
                  ? "bg-green-500 text-white scale-95"
                  : "bg-[#0066FF] text-white hover:bg-[#0052cc]"
              }`}
            >
              {animating ? "Confirming..." : "Confirm Booking"}
            </button>
            <button onClick={() => setStep(1)} className="text-xs text-gray-400 mt-2 hover:text-gray-600 cursor-pointer">Change time</button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="animate-[fadeIn_0.3s_ease-out] text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">Booked!</p>
            <p className="text-sm text-gray-500 mt-1">Feb {selectedDay} at {selectedTime}</p>
            <p className="text-xs text-gray-400 mt-1">Confirmation sent to your email</p>
            <button
              onClick={handleReset}
              className="mt-4 text-xs text-[#0066FF] hover:underline cursor-pointer"
            >
              Try again →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Chat Demo ──────────────────────────────────────────────────────
function AIChatDemo({ persona }: { persona?: string }) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const [typing, setTyping] = useState(false);

  const personaCtx = persona || "a meeting";
  const conversation = [
    { role: "user" as const, text: `Hi! I need to schedule ${personaCtx}.` },
    { role: "ai" as const, text: "Sure! Jane has openings this week:\n• Wed 19th — 9:00 AM, 11:00 AM\n• Thu 20th — 2:30 PM, 4:00 PM\nWhich works?" },
    { role: "user" as const, text: "Wednesday 11 AM works great" },
    { role: "ai" as const, text: "✅ Done! Booked Wed Feb 19 at 11:00 AM. Calendar invite sent to both of you." },
  ];

  const advance = () => {
    if (msgIndex >= conversation.length) return;
    const msg = conversation[msgIndex];
    if (msg.role === "ai") {
      setTyping(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, msg]);
        setTyping(false);
        setMsgIndex((i) => i + 1);
      }, 800);
    } else {
      setMessages((prev) => [...prev, msg]);
      setMsgIndex((i) => i + 1);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setMsgIndex(0);
    setTyping(false);
  };

  // Auto-advance AI responses
  useEffect(() => {
    if (msgIndex > 0 && msgIndex < conversation.length && conversation[msgIndex].role === "ai") {
      const t = setTimeout(advance, 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgIndex]);

  const done = msgIndex >= conversation.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-md mx-auto">
      <div className="bg-[#1a1a2e] px-5 py-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-[#0066FF] rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <p className="text-white text-sm font-semibold">AI Scheduling Assistant</p>
        <span className="ml-auto text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">letsmeet.link</span>
      </div>

      <div className="p-4 min-h-[220px] flex flex-col justify-end">
        <div className="space-y-3 mb-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`animate-[fadeIn_0.3s_ease-out] text-xs leading-relaxed rounded-xl px-3 py-2.5 max-w-[85%] whitespace-pre-line ${
                m.role === "user"
                  ? "bg-gray-100 text-gray-700 ml-auto"
                  : "bg-[#0066FF] text-white"
              }`}
            >
              {m.text}
            </div>
          ))}
          {typing && (
            <div className="bg-[#0066FF] text-white text-xs rounded-xl px-3 py-2.5 max-w-[85%] animate-pulse">
              Typing...
            </div>
          )}
        </div>

        {!done ? (
          <button
            onClick={advance}
            disabled={typing}
            className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-gray-600 font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {msgIndex === 0 ? "Start conversation →" : `Send: "${conversation[msgIndex]?.text.slice(0, 40)}..." →`}
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs text-[#0066FF] font-medium transition-colors cursor-pointer"
          >
            Replay demo →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Comparison Demo (old way vs letsmeet) ─────────────────────────────
function ComparisonDemo({ competitor }: { competitor?: string }) {
  const [showNew, setShowNew] = useState(false);
  const comp = competitor || "Other tools";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 max-w-xs mx-auto">
        <button
          onClick={() => setShowNew(false)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
            !showNew ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          {comp}
        </button>
        <button
          onClick={() => setShowNew(true)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
            showNew ? "bg-[#0066FF] text-white shadow-sm" : "text-gray-500"
          }`}
        >
          letsmeet.link
        </button>
      </div>

      <div className="animate-[fadeIn_0.3s_ease-out]">
        {!showNew ? (
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 text-center">
            <div className="space-y-3 max-w-xs mx-auto">
              <div className="bg-white rounded-lg p-3 text-xs text-gray-500 border border-gray-200 text-left">
                <span className="font-medium text-gray-700">You:</span> Hey, are you free Tuesday?
              </div>
              <div className="bg-white rounded-lg p-3 text-xs text-gray-500 border border-gray-200 text-left">
                <span className="font-medium text-gray-700">Client:</span> Tuesday is tough. How about Wednesday?
              </div>
              <div className="bg-white rounded-lg p-3 text-xs text-gray-500 border border-gray-200 text-left">
                <span className="font-medium text-gray-700">You:</span> Morning or afternoon?
              </div>
              <div className="bg-white rounded-lg p-3 text-xs text-gray-500 border border-gray-200 text-left">
                <span className="font-medium text-gray-700">Client:</span> Afternoon. 3pm?
              </div>
              <div className="bg-white rounded-lg p-3 text-xs text-gray-500 border border-gray-200 text-left">
                <span className="font-medium text-gray-700">You:</span> I have something at 3. How about 4?
              </div>
              <p className="text-xs text-red-400 font-medium pt-2">⏱ 5 emails, 2 days later...</p>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 text-center">
            <div className="space-y-3 max-w-xs mx-auto">
              <div className="bg-white rounded-lg p-3 text-xs text-gray-700 border border-gray-200 text-left">
                <span className="font-medium">You:</span> Here&apos;s my booking link →
              </div>
              <div className="bg-[#0066FF] rounded-lg p-3 text-xs text-white text-left">
                ✅ Client booked Wed at 4:00 PM
              </div>
              <p className="text-xs text-[#0066FF] font-medium pt-2">⚡ 1 message, 30 seconds</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Quick Savings Calculator Mini Demo ────────────────────────────────
function CalculatorDemo() {
  const [meetings, setMeetings] = useState(10);
  const saved = Math.round(meetings * 15 * 52); // 15 min saved per meeting, 52 weeks
  const moneySaved = Math.round(saved * (50 / 60)); // at $50/hr

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-md mx-auto">
      <div className="bg-gradient-to-r from-[#0066FF] to-[#0052cc] px-5 py-3">
        <p className="text-white text-sm font-semibold">⚡ Quick Savings Calculator</p>
        <p className="text-white/70 text-[10px]">See how much scheduling time you could save</p>
      </div>
      <div className="p-5">
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Meetings per week: <span className="text-[#0066FF] font-bold">{meetings}</span>
        </label>
        <input
          type="range"
          min={1}
          max={40}
          value={meetings}
          onChange={(e) => setMeetings(+e.target.value)}
          className="w-full accent-[#0066FF] mb-4"
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-green-600 font-medium">Hours saved/year</p>
            <p className="text-2xl font-bold text-green-700">{Math.round(saved / 60)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-[#0066FF] font-medium">Money saved/year</p>
            <p className="text-2xl font-bold text-[#0066FF]">${moneySaved.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center">Based on 15 min saved per meeting at $50/hr avg.</p>
      </div>
    </div>
  );
}

// ─── Team Scheduling Demo ──────────────────────────────────────────────
function TeamDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const members = [
    { name: "Alice", role: "Sales Lead", avail: "9 AM – 12 PM", color: "bg-purple-100 text-purple-700" },
    { name: "Bob", role: "Account Exec", avail: "1 PM – 5 PM", color: "bg-emerald-100 text-emerald-700" },
    { name: "Carol", role: "Solutions Eng", avail: "10 AM – 3 PM", color: "bg-amber-100 text-amber-700" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-md mx-auto">
      <div className="bg-[#1a1a2e] px-5 py-3">
        <p className="text-white text-sm font-semibold">🏢 Round-Robin Scheduling</p>
        <p className="text-white/50 text-[10px]">Automatically routes to the right team member</p>
      </div>
      <div className="p-4 space-y-2">
        {members.map((m) => (
          <button
            key={m.name}
            onClick={() => setSelected(m.name)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
              selected === m.name
                ? "border-[#0066FF] bg-blue-50"
                : "border-gray-100 hover:border-gray-200"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${m.color}`}>
              {m.name[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{m.name}</p>
              <p className="text-[10px] text-gray-500">{m.role} · {m.avail}</p>
            </div>
            {selected === m.name && (
              <span className="text-xs text-[#0066FF] font-medium animate-[fadeIn_0.3s_ease-out]">Auto-assigned ✓</span>
            )}
          </button>
        ))}
        {selected && (
          <div className="animate-[fadeIn_0.3s_ease-out] bg-green-50 rounded-xl p-3 text-center mt-2">
            <p className="text-xs text-green-700">
              <strong>{selected}</strong> was auto-assigned based on availability and workload
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────
export default function InteractiveDemo({
  variant = "booking",
  competitor,
  persona,
  compact,
}: InteractiveDemoProps) {
  const demoMap: Record<DemoVariant, React.ReactNode> = {
    booking: <BookingDemo persona={persona} compact={compact} />,
    "ai-chat": <AIChatDemo persona={persona} />,
    comparison: <ComparisonDemo competitor={competitor} />,
    calculator: <CalculatorDemo />,
    team: <TeamDemo />,
  };

  return (
    <section className="py-12">
      <div className="mb-6 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Interactive Demo</p>
        <p className="text-sm text-gray-500">Click through to see how it works</p>
      </div>
      {demoMap[variant]}
      <div className="text-center mt-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0066FF] hover:underline"
        >
          Try it for real — free →
        </Link>
      </div>
    </section>
  );
}
