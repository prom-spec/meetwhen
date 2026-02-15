import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Simple rate limiting for admin endpoint
const adminRateLimit = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = adminRateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    adminRateLimit.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }
  entry.count++;
  return entry.count > 10; // 10 attempts per minute
}

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const fromHeader = req.headers.get("x-admin-secret");
  const fromCookie = req.cookies.get("admin_secret")?.value;
  const fromQuery = new URL(req.url).searchParams.get("secret");
  return fromHeader === secret || fromCookie === secret || fromQuery === secret;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!checkAuth(req)) return unauthorized();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  try {
    const [
      // Overview
      totalUsers,
      usersThisWeek,
      usersThisMonth,
      totalBookings,
      bookingsThisWeek,
      bookingsThisMonth,
      totalEventTypes,
      activeEventTypes,
      totalPageViews,
      bookingConfirmedViews,

      // User stats
      usersByPlan,
      usersWithGoogle,
      usersWithCustomDomain,
      usersWithBranding,
      top10UsersByBookings,
      recentSignups,

      // Booking stats
      bookingsByStatus,
      bookingsOverTime,
      bookingsByLocationType,
      avgBookingsPerUser,
      recurringBookings,
      oneOffBookings,

      // Feature usage
      eventTypesByLocation,
      eventTypesByScheduling,
      eventTypesByVisibility,
      usersWithCustomQuestions,
      usersWithScreeningQuestions,
      usersWithBookingLimits,
      usersWithRedirectUrl,
      usersWithPayment,
      usersWithBufferTimes,
      usersWithRecurring,
      teamsCount,
      teamMembersStats,
      webhooksActive,
      webhookDeliveryStats,
      workflowsByTrigger,
      workflowExecutionStats,
      routingFormsCount,
      emailSequencesCount,
      meetingPollsCount,
      apiKeysCount,
      oneOffLinksCount,
      contactsCount,
      availabilitySharesCount,

      // Funnel
      pageViewsByStage,
      topEventTypesByViews,

      // Errors
      recentErrors,
      errorsBySource,
      errorRateOverTime,

      // Audit
      recentAuditLogs,
    ] = await Promise.all([
      // Overview
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.booking.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.eventType.count(),
      prisma.eventType.count({ where: { isActive: true } }),
      prisma.pageView.count(),
      prisma.pageView.count({ where: { stage: "booking_confirmed" } }),

      // User stats
      prisma.user.groupBy({ by: ["plan"], _count: true }),
      prisma.account.findMany({ where: { provider: "google" }, select: { userId: true }, distinct: ["userId"] }).then(r => r.length),
      prisma.user.count({ where: { customDomain: { not: null } } }),
      prisma.user.count({ where: { OR: [{ brandColor: { not: null } }, { brandLogo: { not: null } }, { removeBranding: true }, { hidePoweredBy: true }] } }),
      prisma.booking.groupBy({ by: ["hostId"], _count: true, orderBy: { _count: { hostId: "desc" } }, take: 10 }).then(async (results) => {
        const userIds = results.map(r => r.hostId);
        const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, name: true } });
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));
        return results.map(r => ({ ...userMap[r.hostId], bookingCount: r._count }));
      }),
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, email: true, name: true, plan: true, createdAt: true } }),

      // Booking stats
      prisma.booking.groupBy({ by: ["status"], _count: true }),
      prisma.$queryRaw`
        SELECT DATE(\"createdAt\") as date, COUNT(*)::int as count
        FROM "Booking"
        WHERE "createdAt" >= ${monthAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
      prisma.$queryRaw`
        SELECT et."locationType", COUNT(b.id)::int as count
        FROM "Booking" b
        JOIN "EventType" et ON b."eventTypeId" = et.id
        GROUP BY et."locationType"
      `,
      prisma.booking.count().then(async (total) => {
        const users = await prisma.user.count();
        return users > 0 ? (total / users).toFixed(2) : "0";
      }),
      prisma.booking.count({ where: { recurrenceRule: { not: null } } }),
      prisma.booking.count({ where: { recurrenceRule: null } }),

      // Feature usage
      prisma.eventType.groupBy({ by: ["locationType"], _count: true }),
      prisma.eventType.groupBy({ by: ["schedulingType"], _count: true }),
      prisma.eventType.groupBy({ by: ["visibility"], _count: true }),
      prisma.eventType.count({ where: { customQuestions: { not: null } } }),
      prisma.eventType.count({ where: { screeningQuestions: { not: null } } }),
      prisma.eventType.count({ where: { OR: [{ maxBookingsPerDay: { not: null } }, { maxBookingsPerWeek: { not: null } }] } }),
      prisma.eventType.count({ where: { redirectUrl: { not: null } } }),
      prisma.eventType.count({ where: { price: { not: null } } }),
      prisma.eventType.count({ where: { OR: [{ bufferBefore: { gt: 0 } }, { bufferAfter: { gt: 0 } }] } }),
      prisma.eventType.count({ where: { allowRecurring: true } }),
      prisma.team.count(),
      prisma.teamMember.groupBy({ by: ["teamId"], _count: true }),
      prisma.webhook.count({ where: { active: true } }),
      prisma.webhookDelivery.groupBy({ by: ["status"], _count: true }),
      prisma.workflow.groupBy({ by: ["trigger"], _count: true }),
      prisma.workflowExecution.groupBy({ by: ["status"], _count: true }),
      prisma.routingForm.count(),
      prisma.emailSequence.count(),
      prisma.meetingPoll.count(),
      prisma.apiKey.count({ where: { revokedAt: null } }),
      prisma.oneOffLink.count(),
      prisma.contactProfile.count(),
      prisma.availabilityShare.count(),

      // Funnel
      prisma.pageView.groupBy({ by: ["stage"], _count: true }),
      prisma.$queryRaw`
        SELECT pv."eventTypeId", et.title, et.slug, COUNT(*)::int as views
        FROM "PageView" pv
        JOIN "EventType" et ON pv."eventTypeId" = et.id
        WHERE pv.stage = 'view'
        GROUP BY pv."eventTypeId", et.title, et.slug
        ORDER BY views DESC
        LIMIT 10
      `,

      // Errors
      prisma.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.errorLog.groupBy({ by: ["source"], _count: true, orderBy: { _count: { source: "desc" } } }),
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "ErrorLog"
        WHERE "createdAt" >= ${weekAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,

      // Audit
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { email: true, name: true } } } }),
    ]);

    // Compute funnel conversion rates
    const stageMap: Record<string, number> = {};
    pageViewsByStage.forEach((s: { stage: string; _count: number }) => { stageMap[s.stage] = s._count; });
    const funnel = {
      view: stageMap["view"] || 0,
      slot_selected: stageMap["slot_selected"] || 0,
      booking_confirmed: stageMap["booking_confirmed"] || 0,
      viewToSlot: stageMap["view"] ? ((stageMap["slot_selected"] || 0) / stageMap["view"] * 100).toFixed(1) : "0",
      slotToBooking: stageMap["slot_selected"] ? ((stageMap["booking_confirmed"] || 0) / stageMap["slot_selected"] * 100).toFixed(1) : "0",
      viewToBooking: stageMap["view"] ? ((stageMap["booking_confirmed"] || 0) / stageMap["view"] * 100).toFixed(1) : "0",
    };

    return NextResponse.json({
      overview: {
        totalUsers,
        usersThisWeek,
        usersThisMonth,
        totalBookings,
        bookingsThisWeek,
        bookingsThisMonth,
        totalEventTypes,
        activeEventTypes,
        inactiveEventTypes: totalEventTypes - activeEventTypes,
        totalPageViews,
        bookingConfirmedViews,
        conversionRate: totalPageViews > 0 ? (bookingConfirmedViews / totalPageViews * 100).toFixed(1) : "0",
      },
      users: {
        byPlan: usersByPlan.map((p: { plan: string; _count: number }) => ({ plan: p.plan, count: p._count })),
        withGoogle: usersWithGoogle,
        withCustomDomain: usersWithCustomDomain,
        withBranding: usersWithBranding,
        top10ByBookings: top10UsersByBookings,
        recentSignups,
      },
      bookings: {
        byStatus: bookingsByStatus.map((s: { status: string; _count: number }) => ({ status: s.status, count: s._count })),
        overTime: bookingsOverTime,
        byLocationType: bookingsByLocationType,
        avgPerUser: avgBookingsPerUser,
        recurring: recurringBookings,
        oneOff: oneOffBookings,
      },
      features: {
        eventTypesByLocation: eventTypesByLocation.map((e: { locationType: string; _count: number }) => ({ type: e.locationType, count: e._count })),
        eventTypesByScheduling: eventTypesByScheduling.map((e: { schedulingType: string; _count: number }) => ({ type: e.schedulingType, count: e._count })),
        eventTypesByVisibility: eventTypesByVisibility.map((e: { visibility: string; _count: number }) => ({ type: e.visibility, count: e._count })),
        customQuestions: usersWithCustomQuestions,
        screeningQuestions: usersWithScreeningQuestions,
        bookingLimits: usersWithBookingLimits,
        redirectUrls: usersWithRedirectUrl,
        payment: usersWithPayment,
        bufferTimes: usersWithBufferTimes,
        recurring: usersWithRecurring,
        teams: teamsCount,
        teamMembersStats: teamMembersStats.map((t: { teamId: string; _count: number }) => ({ teamId: t.teamId, members: t._count })),
        webhooksActive,
        webhookDeliveries: webhookDeliveryStats.map((d: { status: string; _count: number }) => ({ status: d.status, count: d._count })),
        workflowsByTrigger: workflowsByTrigger.map((w: { trigger: string; _count: number }) => ({ trigger: w.trigger, count: w._count })),
        workflowExecutions: workflowExecutionStats.map((w: { status: string; _count: number }) => ({ status: w.status, count: w._count })),
        routingForms: routingFormsCount,
        emailSequences: emailSequencesCount,
        meetingPolls: meetingPollsCount,
        apiKeys: apiKeysCount,
        oneOffLinks: oneOffLinksCount,
        contacts: contactsCount,
        availabilityShares: availabilitySharesCount,
      },
      funnel: {
        ...funnel,
        topEventTypesByViews,
      },
      errors: {
        recent: recentErrors,
        bySource: errorsBySource.map((e: { source: string; _count: number }) => ({ source: e.source, count: e._count })),
        rateOverTime: errorRateOverTime,
      },
      audit: {
        recent: recentAuditLogs,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
