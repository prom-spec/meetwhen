export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE'

export interface PlanFeatures {
  maxEventTypes: number
  maxCalendars: number
  multipleAccounts: boolean
  removeBranding: boolean
  workflows: boolean
  webhooks: boolean
  screening: boolean
  customDomain: boolean
  routing: boolean
  cancellationPolicy: boolean
  bookOnBehalf: boolean
  analytics: boolean
  embedCustomization: boolean
  sequences: boolean
  contacts: boolean
  teams: boolean
  sso: boolean
  scim: boolean
  auditLogs: boolean
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  FREE: {
    maxEventTypes: 1,
    maxCalendars: 1,
    multipleAccounts: false,
    removeBranding: false,
    workflows: false,
    webhooks: false,
    screening: false,
    customDomain: false,
    routing: false,
    cancellationPolicy: false,
    bookOnBehalf: false,
    analytics: false,
    embedCustomization: false,
    sequences: false,
    contacts: false,
    teams: false,
    sso: false,
    scim: false,
    auditLogs: false,
  },
  PRO: {
    maxEventTypes: 999,
    maxCalendars: 6,
    multipleAccounts: true,
    removeBranding: true,
    workflows: true,
    webhooks: true,
    screening: true,
    customDomain: true,
    routing: true,
    cancellationPolicy: true,
    bookOnBehalf: true,
    analytics: true,
    embedCustomization: true,
    sequences: true,
    contacts: true,
    teams: false,
    sso: false,
    scim: false,
    auditLogs: false,
  },
  ENTERPRISE: {
    maxEventTypes: 999,
    maxCalendars: 999,
    multipleAccounts: true,
    removeBranding: true,
    workflows: true,
    webhooks: true,
    screening: true,
    customDomain: true,
    routing: true,
    cancellationPolicy: true,
    bookOnBehalf: true,
    analytics: true,
    embedCustomization: true,
    sequences: true,
    contacts: true,
    teams: true,
    sso: true,
    scim: true,
    auditLogs: true,
  },
} as const

export type PlanFeature = keyof PlanFeatures

export function canAccess(plan: Plan, feature: PlanFeature): boolean {
  return !!PLAN_FEATURES[plan]?.[feature]
}

export function getNumericLimit(plan: Plan, feature: 'maxEventTypes' | 'maxCalendars'): number {
  return PLAN_FEATURES[plan]?.[feature] ?? 0
}

export function requiredPlanFor(feature: PlanFeature): Plan {
  if (PLAN_FEATURES.FREE[feature]) return 'FREE'
  if (PLAN_FEATURES.PRO[feature]) return 'PRO'
  return 'ENTERPRISE'
}

export function getPlanFromUser(user: { plan?: string }): Plan {
  const p = user?.plan?.toUpperCase()
  if (p === 'PRO' || p === 'ENTERPRISE') return p
  return 'FREE'
}

export const PLAN_NAMES: Record<Plan, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
}

export const PLAN_PRICES: Record<Plan, string> = {
  FREE: 'Free',
  PRO: '$1/mo',
  ENTERPRISE: '$3/seat/mo',
}
