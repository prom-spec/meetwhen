export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE'

export const PLAN_FEATURES = {
  FREE: { removeBranding: false, teams: false, sso: false, scim: false, auditLogs: false, maxEventTypes: 3 },
  PRO: { removeBranding: true, teams: false, sso: false, scim: false, auditLogs: false, maxEventTypes: 999 },
  ENTERPRISE: { removeBranding: true, teams: true, sso: true, scim: true, auditLogs: true, maxEventTypes: 999 },
} as const

export function canAccess(plan: Plan, feature: keyof typeof PLAN_FEATURES['FREE']): boolean {
  return !!PLAN_FEATURES[plan]?.[feature]
}

export function getPlanFromUser(user: { plan?: string }): Plan {
  const p = user?.plan?.toUpperCase()
  if (p === 'PRO' || p === 'ENTERPRISE') return p
  return 'FREE'
}
