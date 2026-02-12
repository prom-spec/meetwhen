# MeetWhen Feature Workplan — Feb 12, 2026

## Phase 1: Implementable Now (12 features)

### Sprint 1 — Quick Wins (ETA: 2-3 hours)
| # | Feature | Complexity | Agent |
|---|---------|-----------|-------|
| 1 | Cancellation policy setting | Simple — add field to EventType model + UI | Dev |
| 2 | Custom confirmation pages with preferred links | Simple — add field to EventType + render | Dev |
| 3 | Custom colors for embedded widget | Simple — CSS variables config per user | Dev |
| 4 | Google Analytics / Meta Pixel tracking | Simple — inject user-provided script IDs | Dev |
| 5 | Fix comparison table ($2→$1) + add missing features to pricing page | Simple — update pricing page | Dev |

### Sprint 2 — Medium Features (ETA: 4-6 hours)
| # | Feature | Complexity | Agent |
|---|---------|-----------|-------|
| 6 | Screening/qualification forms | Medium — custom form builder + DB schema | Dev |
| 7 | Multi-person/group meeting types | Medium — multiple hosts per event type | Dev |
| 8 | Book meetings on behalf of others | Medium — proxy booking flow | Dev |
| 9 | Data deletion API | Medium — GDPR endpoint, cascade deletes | Dev + Security |

### Sprint 3 — Complex Features (ETA: 6-8 hours)
| # | Feature | Complexity | Agent |
|---|---------|-----------|-------|
| 10 | Round-robin distribution (Pro tier) | Complex — assignment algorithm, fairness | Dev |
| 11 | Scheduling outreach automation | Complex — email sequence builder + Resend | Dev |
| 12 | Custom domain support | Complex — Cloudflare API integration | Dev + Security |

## Phase 2: Blocked Features (logged for later)
| Feature | Blocker |
|---------|---------|
| Microsoft/Outlook calendar | Azure AD app registration + API keys |
| Microsoft Teams video | Azure AD dependency |
| HubSpot integration | OAuth app + marketplace listing |
| Mailchimp integration | OAuth app + marketplace listing |
| Zapier integration | Zapier developer platform approval |
| Salesforce CRM sync | Salesforce connected app |
| PayPal payments | PayPal business account |
| SCIM provisioning | Complex enterprise SSO infrastructure |
| Mobile app | Separate React Native/Flutter project |
| Browser extension | Separate Chrome extension project |

## Agent Assignments
- **Dev Agent**: All implementation — Prisma schema, API routes, React components
- **QA Agent**: Test each feature after implementation — booking flows, edge cases, regressions
- **Security Agent**: Review data deletion API, custom domain (DNS hijack risks), auth flows
- **UI/UX Agent**: Review all new UI — forms, settings pages, booking experience consistency
- **PM Agent**: Track progress, update this file, coordinate handoffs

## Overall ETA: ~12-16 hours total
- Sprint 1: 2-3h (quick wins)
- Sprint 2: 4-6h (medium)
- Sprint 3: 6-8h (complex)
- QA + Security review: parallel throughout

## Also in progress (from earlier today)
- Email invite subject — include event title + participant names
- Multi-account support — switch primary Google account per event type
- Payment/pricing mockup pages — DONE ✅
