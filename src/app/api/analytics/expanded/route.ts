import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // --- Meeting Polls ---
    const [totalPolls, openPolls, closedPolls, bookedPolls, totalVotes] =
      await Promise.all([
        prisma.meetingPoll.count({ where: { createdBy: userId } }),
        prisma.meetingPoll.count({ where: { createdBy: userId, status: "open" } }),
        prisma.meetingPoll.count({ where: { createdBy: userId, status: "closed" } }),
        prisma.meetingPoll.count({ where: { createdBy: userId, status: "booked" } }),
        prisma.pollVote.count({
          where: { poll: { createdBy: userId } },
        }),
      ])
    const pollConversionRate =
      totalPolls > 0 ? Math.round((bookedPolls / totalPolls) * 1000) / 10 : 0

    // --- Recurring vs One-time ---
    const [recurringBookings, totalBookings] = await Promise.all([
      prisma.booking.count({
        where: { hostId: userId, recurrenceRule: { not: null } },
      }),
      prisma.booking.count({ where: { hostId: userId } }),
    ])
    const oneTimeBookings = totalBookings - recurringBookings

    // Recurring series completion: count parent bookings and their children
    const recurrenceParents = await prisma.booking.findMany({
      where: {
        hostId: userId,
        recurrenceRule: { not: null },
        recurrenceParentId: null,
      },
      select: {
        id: true,
        recurrenceRule: true,
        status: true,
        _count: { select: { recurrenceChildren: true } },
      },
    })

    // Estimate expected occurrences from rule
    const parseExpected = (rule: string | null): number => {
      if (!rule) return 1
      const match = rule.match(/_(\d+)$/)
      return match ? parseInt(match[1], 10) : 4
    }

    let totalExpected = 0
    let totalActual = 0
    for (const p of recurrenceParents) {
      const expected = parseExpected(p.recurrenceRule)
      totalExpected += expected
      totalActual += 1 + p._count.recurrenceChildren // parent + children
    }
    const seriesCompletionRate =
      totalExpected > 0
        ? Math.round((totalActual / totalExpected) * 1000) / 10
        : 0

    // --- Group Events ---
    const groupEventTypes = await prisma.eventType.findMany({
      where: { userId, maxAttendees: { gt: 1 } },
      select: {
        id: true,
        title: true,
        maxAttendees: true,
        _count: { select: { bookings: true } },
      },
    })

    // For each group event type, calculate bookings per unique time slot
    const groupStats = await Promise.all(
      groupEventTypes.map(async (et) => {
        const bookings = await prisma.booking.findMany({
          where: { eventTypeId: et.id },
          select: { startTime: true },
        })
        const slotCounts: Record<string, number> = {}
        for (const b of bookings) {
          const key = b.startTime.toISOString()
          slotCounts[key] = (slotCounts[key] || 0) + 1
        }
        const slots = Object.values(slotCounts)
        const avgAttendees =
          slots.length > 0
            ? Math.round((slots.reduce((a, b) => a + b, 0) / slots.length) * 10) / 10
            : 0
        const avgFillRate =
          slots.length > 0 && et.maxAttendees > 0
            ? Math.round(
                (slots.reduce((a, b) => a + b, 0) /
                  slots.length /
                  et.maxAttendees) *
                  1000
              ) / 10
            : 0
        return {
          title: et.title,
          maxAttendees: et.maxAttendees,
          totalBookings: et._count.bookings,
          uniqueSlots: slots.length,
          avgAttendees,
          avgFillRate,
        }
      })
    )

    const totalGroupBookings = groupStats.reduce(
      (sum, g) => sum + g.totalBookings,
      0
    )

    // --- Custom Questions ---
    const bookingsWithAnswers = await prisma.booking.findMany({
      where: {
        hostId: userId,
        customAnswers: { not: null },
      },
      select: { customAnswers: true },
      take: 500, // limit for performance
    })

    const answerCounts: Record<string, Record<string, number>> = {}
    for (const b of bookingsWithAnswers) {
      try {
        const answers =
          typeof b.customAnswers === "string"
            ? JSON.parse(b.customAnswers)
            : b.customAnswers
        if (answers && typeof answers === "object") {
          for (const [qId, answer] of Object.entries(answers)) {
            if (!answerCounts[qId]) answerCounts[qId] = {}
            const ansStr = String(answer).substring(0, 100)
            answerCounts[qId][ansStr] = (answerCounts[qId][ansStr] || 0) + 1
          }
        }
      } catch {
        // skip malformed
      }
    }

    // Get question labels from event types
    const eventTypesWithQuestions = await prisma.eventType.findMany({
      where: { userId, customQuestions: { not: null } },
      select: { customQuestions: true },
    })

    const questionLabels: Record<string, string> = {}
    for (const et of eventTypesWithQuestions) {
      try {
        const questions =
          typeof et.customQuestions === "string"
            ? JSON.parse(et.customQuestions)
            : et.customQuestions
        if (Array.isArray(questions)) {
          for (const q of questions) {
            if (q.id && q.label) questionLabels[q.id] = q.label
          }
        }
      } catch {
        // skip
      }
    }

    // Build top answers per question
    const customQuestionsStats = Object.entries(answerCounts).map(
      ([qId, answers]) => {
        const sorted = Object.entries(answers)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
        return {
          questionId: qId,
          label: questionLabels[qId] || qId,
          totalResponses: Object.values(answers).reduce((a, b) => a + b, 0),
          topAnswers: sorted.map(([answer, count]) => ({ answer, count })),
        }
      }
    )

    // --- Routing Forms ---
    const [totalForms, totalRules] = await Promise.all([
      prisma.routingForm.count({ where: { userId } }),
      prisma.routingRule.count({ where: { form: { userId } } }),
    ])

    return NextResponse.json({
      polls: {
        total: totalPolls,
        open: openPolls,
        closed: closedPolls,
        booked: bookedPolls,
        totalVotes,
        conversionRate: pollConversionRate,
      },
      recurring: {
        recurringBookings,
        oneTimeBookings,
        totalSeries: recurrenceParents.length,
        seriesCompletionRate,
      },
      groupEvents: {
        totalGroupBookings,
        eventTypes: groupStats,
      },
      customQuestions: customQuestionsStats,
      routingForms: {
        totalForms,
        totalRules,
      },
    })
  } catch (error) {
    apiLogger.error("Error fetching expanded analytics:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
