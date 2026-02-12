"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Crown, Sparkles, Building2, Check, X, ExternalLink, Heart, Copy, CheckCheck } from "lucide-react"

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Crown,
    features: ["1 event type", "1 Google calendar", "Unlimited bookings", "AI chat scheduling"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$1",
    period: "/month",
    icon: Sparkles,
    features: ["Unlimited event types", "6 calendars", "Remove branding", "Workflows & API", "Custom domain"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$3",
    period: "/seat/month",
    icon: Building2,
    features: ["Everything in Pro", "Unlimited team members", "Round-robin scheduling", "SSO & SAML", "Dedicated support"],
  },
]

export default function BillingPage() {
  const { data: session } = useSession()
  const [currentPlan, setCurrentPlan] = useState("free")
  const [loading, setLoading] = useState(true)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setCurrentPlan(data.plan || "free")
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500 mt-1">Manage your plan and billing</p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          Early Adopter — 100% off all plans!
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current plan</p>
            <p className="text-xl font-bold text-gray-900 capitalize">{loading ? "..." : currentPlan}</p>
          </div>
          <Link
            href="/pricing"
            className="text-sm text-[#0066FF] hover:underline flex items-center gap-1"
          >
            View full pricing <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => {
          const Icon = plan.icon
          const isCurrent = currentPlan === plan.id
          return (
            <div
              key={plan.id}
              className={`rounded-xl border-2 p-6 flex flex-col ${
                isCurrent
                  ? "border-[#0066FF] bg-blue-50/30"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${isCurrent ? "text-[#0066FF]" : "text-gray-400"}`} />
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
                {isCurrent && (
                  <span className="ml-auto text-xs bg-[#0066FF] text-white px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <div className="mb-3">
                <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-4 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button disabled className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed">
                  Current Plan
                </button>
              ) : (
                <Link
                  href={`/dashboard/billing/checkout?plan=${plan.id}`}
                  className={`block text-center py-2 rounded-lg text-sm font-medium transition-colors ${
                    plan.id === "pro"
                      ? "bg-[#0066FF] text-white hover:bg-[#0052CC]"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {plan.id === "free" ? "Downgrade" : "Upgrade"}
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* Donate Section */}
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-pink-500" />
          <h2 className="text-lg font-bold text-gray-900">Buy us a coffee ☕</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Love letsmeet.link? Support our development with a crypto donation. Every bit helps!
        </p>
        <div className="space-y-3">
          {[
            { label: "ETH (ERC-20)", address: "0xf1a6c6D72CD1e4213f5A6d501416FF364930474B" },
            { label: "BTC", address: "bc1qep7cp7scfzptrnnhgs3w5zxx965yrc83kvhtkh" },
          ].map(({ label, address }) => (
            <div key={label} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-pink-100">
              <span className="text-xs font-bold text-gray-500 w-16 shrink-0">{label}</span>
              <code className="text-xs text-gray-700 truncate flex-1">{address}</code>
              <button
                onClick={() => copyAddress(address)}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                title="Copy address"
              >
                {copiedAddress === address ? (
                  <CheckCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
