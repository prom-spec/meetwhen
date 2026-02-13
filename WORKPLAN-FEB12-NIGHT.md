# LetsMeet Night Sprint — Feb 12, 2026

## 11 Features — No External Dependencies

### Sprint 1: Data & API Layer (parallel)
| # | Feature | Description | Agent |
|---|---------|-------------|-------|
| 1 | **Contact profiles & activity** | ContactProfile model, auto-create on booking, track history, dashboard page /dashboard/contacts with search/filter, per-contact timeline | Dev-1 |
| 2 | **Custom webhooks** | WebhookEndpoint model, CRUD UI in settings, fire on booking.created/cancelled/rescheduled, HMAC signing, retry logic, delivery logs | Dev-2 |
| 3 | **Public Scheduling API** | REST API at /api/v1/* — list event types, get availability, create booking, cancel booking. API key management in settings. OpenAPI spec. Rate limiting. | Dev-3 |

### Sprint 2: Team & Admin (parallel)
| # | Feature | Description | Agent |
|---|---------|-------------|-------|
| 4 | **Team groups + admin roles** | Group model (departments/teams), assign members, group-level admins, group-scoped event types, dashboard UI | Dev-4 |
| 5 | **Domain control & oversight** | Claim domain via DNS TXT, auto-capture accounts on that domain, admin dashboard showing all org accounts, force settings | Dev-5 |
| 6 | **Org branding enforcement** | Admin sets org brand (colors, logo, footer text), toggle to enforce across all team members, override individual settings | Dev-5 (bundled) |
| 7 | **SCIM group provisioning** | Extend existing SCIM /Groups endpoint to actually provision team groups, sync with IdP groups | Dev-4 (bundled) |

### Sprint 3: Scheduling Features (parallel)
| # | Feature | Description | Agent |
|---|---------|-------------|-------|
| 8 | **One-off meeting links** | Single-use scheduling links, auto-expire after booking, shareable, dashboard management | Dev-6 |
| 9 | **Share availability from contacts** | Generate availability share link per contact, personalized view, "pick a time" for specific person | Dev-6 (bundled) |
| 10 | **Multi-step reminder workflows** | Reminder sequences: X days before, 1 day before, 1 hour before. Customizable per event type. SMS placeholder for future. | Dev-7 |
| 11 | **Remove branding toggle** | Pro/Enterprise feature — toggle in settings to hide powered-by footer. Check plan tier server-side. | Dev-7 (bundled) |

### QA & Security (after all sprints)
| Role | Scope | Agent |
|------|-------|-------|
| **QA** | Test all 11 features E2E, regression test existing features, edge cases | QA |
| **Security** | Auth on all new endpoints, SCIM group auth, webhook HMAC, API key security, domain verification spoofing, rate limits | Security |

### Cross-cutting
| Role | Scope | Agent |
|------|-------|-------|
| **UX/Copy** | Microcopy for all new UI (settings labels, empty states, error messages, tooltips, API docs page copy) | UX-Copy |
| **PM** | Main session — coordinate, merge conflicts, final deploy | Me |

## Architecture Notes
- All new models via Prisma schema extension
- Contact profiles: link to existing Booking model
- Webhooks: async fire via fetch + retry queue (simple, no external deps)
- API: /api/v1/* namespace, separate from internal routes
- Domain control: DNS TXT record verification (like Google Search Console)
- All features respect existing plan tiers (Free/Pro/Enterprise)

## Git Strategy
- Each agent works on a feature branch
- PM merges to main after review
- Single deploy after all QA passes
