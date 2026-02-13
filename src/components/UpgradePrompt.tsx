"use client"

import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import { Plan, PLAN_NAMES, PLAN_PRICES } from "@/lib/plans"

interface UpgradePromptProps {
  requiredPlan: Plan
  feature: string
  description?: string
  currentPlan?: Plan
}

export default function UpgradePrompt({ requiredPlan, feature, description, currentPlan }: UpgradePromptProps) {
  return (
    <div className="relative mb-6">
      <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#0066FF] to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">
              Upgrade to {PLAN_NAMES[requiredPlan]} to unlock {feature}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
            <div className="mt-1 text-xs text-gray-500">
              {currentPlan && <>Currently on <span className="font-medium">{PLAN_NAMES[currentPlan]}</span> plan · </>}
              {PLAN_NAMES[requiredPlan]} starts at {PLAN_PRICES[requiredPlan]}
            </div>
            <Link
              href="/dashboard/billing"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 transition-colors shadow-sm"
            >
              Upgrade to {PLAN_NAMES[requiredPlan]}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
