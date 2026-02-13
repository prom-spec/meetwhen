// @ts-nocheck
"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Script from "next/script"
import Link from "next/link"
import { Crown, Sparkles, Building2, Check, ExternalLink, Heart, Copy, CheckCheck } from "lucide-react"

const PRO_CHECKOUT = process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_CHECKOUT_URL || ""
const ENTERPRISE_CHECKOUT = process.env.NEXT_PUBLIC_LEMONSQUEEZY_ENTERPRISE_CHECKOUT_URL || ""

const plans = [
  {
    id: "FREE",
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Crown,
    features: [
      { label: "3 event types", included: true },
      { label: "1 Google calendar", included: true },
      { label: "Unlimited bookings", included: true },
      { label: "AI chat scheduling", included: true },
      { label: "Remove branding", included: false },
      { label: "Teams", included: false },
      { label: "SSO & SAML", included: false },
    ],
    checkoutUrl: "",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$1",
    period: "/month",
    icon: Sparkles,
    features: [
      { label: "Unlimited event types", included: true },
      { label: "6 calendars", included: true },
      { label: "Unlimited bookings", included: true },
      { label: "AI chat scheduling", included: true },
      { label: "Remove branding", included: true },
      { label: "Teams", included: false },
      { label: "SSO & SAML", included: false },
    ],
    checkoutUrl: PRO_CHECKOUT,
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "$3",
    period: "/seat/month",
    icon: Building2,
    features: [
      { label: "Unlimited event types", included: true },
      { label: "Unlimited calendars", included: true },
      { label: "Unlimited bookings", included: true },
      { label: "AI chat scheduling", included: true },
      { label: "Remove branding", included: true },
      { label: "Teams & round-robin", included: true },
      { label: "SSO & SAML", included: true },
    ],
    checkoutUrl: ENTERPRISE_CHECKOUT,
  },
]

export default function BillingPage() {
  const { data: session } = useSession()
  const [currentPlan, setCurrentPlan] = useState("FREE")
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setCurrentPlan((data.plan || "free").toUpperCase())
        setUserId(data.id || (session?.user as any)?.id || "")
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session])

  const handleCheckout = (checkoutUrl: string) => {
    if (!checkoutUrl || !userId) return
    const url = new URL(checkoutUrl)
    url.searchParams.set("checkout[custom][user_id]", userId)
    try {
      ;(window as any).createLemonSqueezy?.()
      ;(window as any).LemonSqueezy?.Url?.Open?.(url.toString())
    } catch {
      // Fallback: open in new tab
      window.open(url.toString(), "_blank")
    }
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" defer />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500 mt-1">Manage your plan and billing</p>
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current plan</p>
            <p className="text-xl font-bold text-gray-900">{loading ? "..." : currentPlan}</p>
          </div>
          {currentPlan !== "FREE" && (
            <a
              href="https://app.lemonsqueezy.com/my-orders"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#0066FF] hover:underline flex items-center gap-1"
            >
              Manage subscription <ExternalLink className="w-3 h-3" />
            </a>
          )}
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
                isCurrent ? "border-[#0066FF] bg-blue-50/30" : "border-gray-200"
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
                  <li key={f.label} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className={`w-4 h-4 shrink-0 ${f.included ? "text-green-500" : "text-gray-300"}`} />
                    <span className={f.included ? "" : "text-gray-400"}>{f.label}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button disabled className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed">
                  Current Plan
                </button>
              ) : plan.checkoutUrl ? (
                <button
                  onClick={() => handleCheckout(plan.checkoutUrl)}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    plan.id === "PRO"
                      ? "bg-[#0066FF] text-white hover:bg-[#0052CC]"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {currentPlan === "ENTERPRISE" ? "Switch" : "Upgrade"}
                </button>
              ) : (
                <button disabled className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed">
                  Free
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Crypto Section */}
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-bold text-gray-900">Pay with Crypto — Save 20%</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Pay for a full year upfront with ETH or BTC and get 2 months free. Send the exact amount and email us your transaction hash.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg p-4 border border-violet-100">
            <p className="text-sm font-semibold text-gray-900 mb-1">Pro — 1 Year</p>
            <p className="text-2xl font-bold text-gray-900">$10 <span className="text-sm font-normal text-gray-500 line-through">$12</span></p>
            <p className="text-xs text-green-600 mt-1">Save $2 (2 months free)</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-violet-100">
            <p className="text-sm font-semibold text-gray-900 mb-1">Enterprise — 1 Year/seat</p>
            <p className="text-2xl font-bold text-gray-900">$30 <span className="text-sm font-normal text-gray-500 line-through">$36</span></p>
            <p className="text-xs text-green-600 mt-1">Save $6 (2 months free)</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: "ETH (ERC-20)", address: "0xf1a6c6D72CD1e4213f5A6d501416FF364930474B" },
            { label: "BTC", address: "bc1qep7cp7scfzptrnnhgs3w5zxx965yrc83kvhtkh" },
          ].map(({ label, address }) => (
            <div key={label} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-violet-100">
              <span className="text-xs font-bold text-gray-500 w-16 shrink-0">{label}</span>
              <code className="text-xs text-gray-700 truncate flex-1">{address}</code>
              <button
                onClick={() => copyAddress(address)}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                {copiedAddress === address ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">After payment, email <a href="mailto:support@letsmeet.link" className="text-violet-600 hover:underline">support@letsmeet.link</a> with your transaction hash.</p>
      </div>

      {/* Donate */}
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-pink-500" />
          <h2 className="text-lg font-bold text-gray-900">Support letsmeet.link ☕</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Love letsmeet.link? Help us keep building!</p>
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
              >
                {copiedAddress === address ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
