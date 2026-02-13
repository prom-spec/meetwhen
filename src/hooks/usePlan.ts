"use client"

import { useState, useEffect, useCallback } from "react"
import { Plan, PlanFeature, PLAN_FEATURES, canAccess as canAccessFn, requiredPlanFor, getPlanFromUser } from "@/lib/plans"

interface UsePlanResult {
  plan: Plan
  loading: boolean
  canAccess: (feature: PlanFeature) => boolean
  requiredPlan: (feature: PlanFeature) => Plan
  getLimit: (feature: 'maxEventTypes' | 'maxCalendars') => number
}

export function usePlan(): UsePlanResult {
  const [plan, setPlan] = useState<Plan>("FREE")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setPlan(getPlanFromUser(data))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const canAccess = useCallback((feature: PlanFeature) => canAccessFn(plan, feature), [plan])
  const requiredPlan = useCallback((feature: PlanFeature) => requiredPlanFor(feature), [])
  const getLimit = useCallback((feature: 'maxEventTypes' | 'maxCalendars') => PLAN_FEATURES[plan]?.[feature] ?? 0, [plan])

  return { plan, loading, canAccess, requiredPlan, getLimit }
}
