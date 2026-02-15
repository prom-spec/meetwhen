"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Check, Calendar, Clock, LinkIcon, Copy, ExternalLink } from "lucide-react"

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href?: string
  checkFn: () => Promise<boolean>
}

export default function OnboardingWizard({ username }: { username?: string | null }) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  const bookingUrl = username ? `https://www.letsmeet.link/${username}` : null

  const steps: OnboardingStep[] = [
    {
      id: "calendar",
      title: "Connect your calendar",
      description: "Link your Google Calendar so we can check your availability in real-time.",
      icon: <Calendar className="w-5 h-5" />,
      href: "/dashboard/settings",
      checkFn: async () => {
        try {
          const res = await fetch("/api/settings/linked-accounts")
          const data = await res.json()
          return Array.isArray(data) && data.length > 0
        } catch { return false }
      },
    },
    {
      id: "availability",
      title: "Set your availability",
      description: "Tell us when you're free to take meetings.",
      icon: <Clock className="w-5 h-5" />,
      href: "/dashboard/availability",
      checkFn: async () => {
        try {
          const res = await fetch("/api/availability")
          const data = await res.json()
          return Array.isArray(data) && data.length > 0
        } catch { return false }
      },
    },
    {
      id: "event-type",
      title: "Create your first event type",
      description: "Set up a meeting type (e.g., 30-min consultation, quick chat).",
      icon: <LinkIcon className="w-5 h-5" />,
      href: "/dashboard/event-types/new",
      checkFn: async () => {
        try {
          const res = await fetch("/api/event-types")
          const data = await res.json()
          return Array.isArray(data) && data.length > 0
        } catch { return false }
      },
    },
    {
      id: "share",
      title: "Share your booking link",
      description: bookingUrl ? `Your link: ${bookingUrl}` : "Set a username in settings to get your booking link.",
      icon: <ExternalLink className="w-5 h-5" />,
      href: username ? undefined : "/dashboard/settings",
      checkFn: async () => !!username,
    },
  ]

  useEffect(() => {
    // Check if user dismissed onboarding
    const wasDismissed = localStorage.getItem("onboarding_dismissed")
    if (wasDismissed) {
      setDismissed(true)
      setLoading(false)
      return
    }

    // Check all steps
    Promise.all(steps.map(async (step) => {
      const done = await step.checkFn()
      return done ? step.id : null
    })).then((results) => {
      const done = new Set(results.filter(Boolean) as string[])
      setCompletedSteps(done)
      // Auto-dismiss if all done
      if (done.size === steps.length) {
        localStorage.setItem("onboarding_dismissed", "true")
        setDismissed(true)
      }
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  if (loading || dismissed) return null

  const progress = (completedSteps.size / steps.length) * 100

  const handleCopy = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Get started with letsmeet.link</h2>
          <p className="text-sm text-gray-500 mt-0.5">Complete these steps to start receiving bookings</p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem("onboarding_dismissed", "true")
            setDismissed(true)
          }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-[#0066FF] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-6 space-y-4">
        {steps.map((step) => {
          const done = completedSteps.has(step.id)
          return (
            <div key={step.id} className={`flex items-start gap-4 ${done ? "opacity-60" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                done ? "bg-green-100 text-green-600" : "bg-blue-50 text-[#0066FF]"
              }`}>
                {done ? <Check className="w-4 h-4" /> : step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-medium ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
                    {step.title}
                  </h3>
                  {done && <span className="text-xs text-green-600 font-medium">Done</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                {step.id === "share" && username && !done && (
                  <button
                    onClick={handleCopy}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#0066FF] hover:text-[#0052cc]"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                )}
              </div>
              {step.href && !done && (
                <Link
                  href={step.href}
                  className="text-sm font-medium text-[#0066FF] hover:text-[#0052cc] whitespace-nowrap"
                >
                  Set up →
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
