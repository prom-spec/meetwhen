"use client"

import { usePlan } from "@/hooks/usePlan"
import UpgradePrompt from "@/components/UpgradePrompt"
import { PlanFeature } from "@/lib/plans"

interface PlanGateProps {
  feature: PlanFeature
  featureLabel: string
  description?: string
  children: React.ReactNode
}

/**
 * Wraps page content with an upgrade banner if user lacks access.
 * Content is still rendered (teaser) but with reduced opacity and pointer-events disabled.
 */
export default function PlanGate({ feature, featureLabel, description, children }: PlanGateProps) {
  const { plan, loading, canAccess, requiredPlan } = usePlan()

  if (loading) return <>{children}</>

  const hasAccess = canAccess(feature)

  if (hasAccess) return <>{children}</>

  return (
    <div>
      <UpgradePrompt
        requiredPlan={requiredPlan(feature)}
        feature={featureLabel}
        description={description}
        currentPlan={plan}
      />
      <div className="relative">
        <div className="opacity-50 pointer-events-none select-none" aria-hidden="true">
          {children}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80" />
      </div>
    </div>
  )
}
