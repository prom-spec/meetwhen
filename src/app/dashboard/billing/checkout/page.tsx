"use client"

import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { useState, Suspense } from "react"
import Link from "next/link"
import { ArrowLeft, CreditCard, Lock, Sparkles, Check, PartyPopper } from "lucide-react"

const planDetails: Record<string, { name: string; price: string; priceNum: number; period: string; features: string[] }> = {
  pro: {
    name: "Pro",
    price: "$1.00",
    priceNum: 1,
    period: "/month",
    features: [
      "Unlimited event types",
      "Connect up to 6 calendars",
      "Multiple Google accounts",
      "Remove letsmeet.link branding",
      "Workflows & automations",
      "Webhooks & API access",
      "Custom domain",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "$3.00",
    priceNum: 3,
    period: "/seat/month",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Round-robin scheduling",
      "Team analytics & insights",
      "Admin-managed event types",
      "SSO / SAML (coming soon)",
      "Audit logs",
      "Dedicated account support",
    ],
  },
}

function CheckoutContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const planId = searchParams.get("plan") || "pro"
  const plan = planDetails[planId]

  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [name, setName] = useState("")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  if (!plan) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-gray-500">Invalid plan selected.</p>
        <Link href="/dashboard/billing" className="text-[#0066FF] hover:underline mt-4 inline-block">
          ← Back to billing
        </Link>
      </div>
    )
  }

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ")
  }

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4)
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return digits
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError("")

    try {
      // Simulate payment processing delay
      await new Promise((r) => setTimeout(r, 2000))

      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      })

      if (!res.ok) throw new Error("Upgrade failed")

      setSuccess(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <PartyPopper className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Welcome to {plan.name}! 🎉
        </h1>
        <p className="text-gray-500 mb-2">
          Your account has been upgraded successfully.
        </p>
        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          Early Adopter — You&apos;re paying $0.00!
        </div>
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-[#0066FF] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#0052CC] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/dashboard/billing"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to billing
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Upgrade to {plan.name}
      </h1>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Payment Form */}
        <div className="md:col-span-3">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <h2 className="font-semibold text-gray-900">Payment details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name on card
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none text-sm font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry
                    </label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none text-sm font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none text-sm font-mono"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-[#0066FF] text-white py-3 rounded-lg font-medium hover:bg-[#0052CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Complete Upgrade — $0.00
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Secured with 256-bit SSL encryption
            </p>
          </form>
        </div>

        {/* Order Summary */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
            <h2 className="font-semibold text-gray-900 mb-4">Order summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{plan.name} plan</span>
                <span className="text-gray-900">{plan.price}<span className="text-gray-400">{plan.period}</span></span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Early Adopter Discount
                </span>
                <span className="text-green-600 font-medium">-100%</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total today</span>
                <div className="text-right">
                  <span className="text-gray-400 line-through text-sm mr-2">{plan.price}</span>
                  <span className="font-bold text-gray-900 text-lg">$0.00</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-3 mb-6">
              <p className="text-xs text-amber-700">
                <strong>Early Adopter Perk:</strong> You&apos;ll keep this 100% discount for as long as your account is active. Thank you for believing in us early! ❤️
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Includes</p>
              {plan.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto py-16 text-center text-gray-400">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
