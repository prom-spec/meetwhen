# Lemon Squeezy Integration — Workplan

## Products
- **Free**: $0/mo — powered-by footer, basic features
- **Pro**: $1/mo — remove branding, all features
- **Enterprise**: $3/seat/mo — teams, SSO, SCIM, audit logs

## Architecture
1. **Checkout**: Lemon.js overlay on billing page
2. **Webhooks**: `/api/webhooks/lemonsqueezy` — verify signature, handle events
3. **DB**: Add to User model: `plan` (FREE/PRO/ENTERPRISE), `lemonCustomerId`, `lemonSubscriptionId`, `planExpiresAt`
4. **Gating**: Middleware/helper to check plan for gated features (remove branding, teams, etc.)
5. **Customer Portal**: Redirect to Lemon Squeezy hosted portal for manage/cancel

## Webhook Events to Handle
- `subscription_created` → set plan + IDs
- `subscription_updated` → handle upgrades/downgrades
- `subscription_cancelled` → revert to FREE at period end
- `subscription_payment_success` → extend planExpiresAt
- `subscription_payment_failed` → notify user, grace period

## Security Requirements
- Verify webhook signatures (X-Signature header + HMAC)
- Store webhook secret in env var
- Don't trust client-side plan state — always check DB
- Rate limit webhook endpoint
- Log all subscription state changes

## Files to Create/Modify
- `src/app/api/webhooks/lemonsqueezy/route.ts` — webhook handler
- `src/app/dashboard/billing/page.tsx` — update with real checkout
- `src/lib/plans.ts` — plan definitions + feature gating
- `prisma/schema.prisma` — add plan fields
- `src/middleware.ts` — plan gating for protected routes
- `.env` — LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_WEBHOOK_SECRET, LEMONSQUEEZY_STORE_ID
