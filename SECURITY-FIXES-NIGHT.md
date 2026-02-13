# Security Fixes — Night Audit 2026-02-12

## CRITICAL: Webhook Secret Exposure

**File:** `src/app/api/webhooks/route.ts`

In POST handler, add `select` to exclude `secret` from response (show it once only in a dedicated field):

```diff
  const webhook = await prisma.webhook.create({
    data: {
      userId: session.user.id,
      url,
      events,
      secret: generateWebhookSecret(),
      active: true,
    },
+   select: {
+     id: true,
+     url: true,
+     events: true,
+     active: true,
+     secret: true,  // Only shown at creation
+     createdAt: true,
+     updatedAt: true,
+   },
  })

- return NextResponse.json(webhook, { status: 201 })
+ // Return secret separately so frontend knows this is the only time it's shown
+ const { secret, ...rest } = webhook
+ return NextResponse.json({ ...rest, secret }, { status: 201 })
```

Note: This is acceptable (show-once pattern). The real issue is ensuring PATCH never returns the secret — currently PATCH has no `select` clause.

**File:** `src/app/api/webhooks/[id]/route.ts` — PATCH already uses `select` without `secret` ✅ (confirmed on re-read). The GET also excludes it ✅. So the exposure is only at creation which is the show-once pattern. **Downgrade to Medium** — still add a comment documenting this is intentional.

---

## HIGH: Team Group Cross-Team Manipulation

**File:** `src/app/api/teams/[teamId]/groups/[groupId]/route.ts`

```diff
  export async function PATCH(req: NextRequest, { params }: RouteParams) {
    // ... auth checks ...
    const { teamId, groupId } = await params

    const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: session.user.id } } })
    if (!member || member.role === "MEMBER") return NextResponse.json({ error: "Admin access required" }, { status: 403 })

+   // Verify group belongs to this team
+   const existingGroup = await prisma.teamGroup.findFirst({ where: { id: groupId, teamId } })
+   if (!existingGroup) return NextResponse.json({ error: "Group not found" }, { status: 404 })

    const body = await req.json()
    const group = await prisma.teamGroup.update({
-     where: { id: groupId },
+     where: { id: groupId, teamId },
      data: { ...(body.name && { name: body.name }), ...(body.description !== undefined && { description: body.description }) },
    })
```

Same fix for DELETE:
```diff
-   await prisma.teamGroup.delete({ where: { id: groupId } })
+   const group = await prisma.teamGroup.findFirst({ where: { id: groupId, teamId } })
+   if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })
+   await prisma.teamGroup.delete({ where: { id: groupId } })
```

**File:** `src/app/api/teams/[teamId]/groups/[groupId]/members/route.ts` — same fix needed for POST and DELETE:
```diff
+ // After admin check, verify group belongs to team
+ const group = await prisma.teamGroup.findFirst({ where: { id: groupId, teamId } })
+ if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })
```

---

## HIGH: SCIM Token Plaintext Storage

**File:** `src/lib/scim-auth.ts`

```diff
+ import { createHash } from "crypto"
+
+ function hashScimToken(token: string): string {
+   return createHash("sha256").update(token).digest("hex")
+ }

  export async function authenticateSCIM(request: Request) {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    if (!token) return null;

-   const scimToken = await prisma.sCIMToken.findUnique({
-     where: { token },
+   const tokenHash = hashScimToken(token)
+   const scimToken = await prisma.sCIMToken.findUnique({
+     where: { tokenHash },
      include: { team: true },
    });
    return scimToken;
  }
```

Also need to update SCIM token generation (`src/app/api/scim/token/route.ts`) to store hashed tokens and the Prisma schema to index `tokenHash` instead of `token`.

---

## HIGH: Remove Branding — No Plan Check

**File:** `src/app/api/settings/route.ts` (~line 131-133)

```diff
-   if (hidePoweredBy !== undefined) updateData.hidePoweredBy = hidePoweredBy
-   if (parsed.data.removeBranding !== undefined) updateData.removeBranding = parsed.data.removeBranding
+   if (hidePoweredBy !== undefined || parsed.data.removeBranding !== undefined) {
+     const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } })
+     if (currentUser?.plan === "free") {
+       return NextResponse.json({ error: "Upgrade required to customize branding" }, { status: 403 })
+     }
+     if (hidePoweredBy !== undefined) updateData.hidePoweredBy = hidePoweredBy
+     if (parsed.data.removeBranding !== undefined) updateData.removeBranding = parsed.data.removeBranding
+   }
```

---

## HIGH: Billing Upgrade No Payment

**File:** `src/app/api/billing/upgrade/route.ts`

If this is not intentional for beta, add Stripe session verification:

```diff
  const { plan } = parsed.data
+ 
+ // Verify payment via Stripe
+ if (plan !== "free") {
+   const { sessionId } = body
+   if (!sessionId) return NextResponse.json({ error: "Payment required" }, { status: 402 })
+   // Verify Stripe checkout session
+   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
+   const session = await stripe.checkout.sessions.retrieve(sessionId)
+   if (session.payment_status !== "paid") {
+     return NextResponse.json({ error: "Payment not completed" }, { status: 402 })
+   }
+ }
```
