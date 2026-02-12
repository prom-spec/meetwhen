import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { apiLogger } from "@/lib/logger"
import { z } from "zod"

const deleteSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
})

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'You must send { "confirmation": "DELETE MY ACCOUNT" } to proceed.' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    apiLogger.info("User data deletion requested", { userId })

    // Cascade delete all user data in correct order
    // Most relations have onDelete: Cascade, but we do explicit cleanup for safety

    // Delete workflow-related data
    await prisma.workflowStepRun.deleteMany({
      where: { execution: { workflow: { userId } } },
    })
    await prisma.workflowExecution.deleteMany({
      where: { workflow: { userId } },
    })
    await prisma.workflowStep.deleteMany({
      where: { workflow: { userId } },
    })
    await prisma.workflow.deleteMany({ where: { userId } })

    // Delete webhook deliveries then webhooks
    await prisma.webhookDelivery.deleteMany({
      where: { webhook: { userId } },
    })
    await prisma.webhook.deleteMany({ where: { userId } })

    // Delete routing forms
    await prisma.routingRule.deleteMany({
      where: { form: { userId } },
    })
    await prisma.routingFormField.deleteMany({
      where: { form: { userId } },
    })
    await prisma.routingForm.deleteMany({ where: { userId } })

    // Delete polls
    await prisma.pollVote.deleteMany({
      where: { poll: { createdBy: userId } },
    })
    await prisma.pollOption.deleteMany({
      where: { poll: { createdBy: userId } },
    })
    await prisma.meetingPoll.deleteMany({ where: { createdBy: userId } })

    // Delete team data (owned teams)
    const ownedTeams = await prisma.team.findMany({ where: { ownerId: userId }, select: { id: true } })
    const teamIds = ownedTeams.map((t) => t.id)
    if (teamIds.length > 0) {
      // Delete team event types and their bookings/page views
      const teamEventTypes = await prisma.eventType.findMany({ where: { teamId: { in: teamIds } }, select: { id: true } })
      const teamEtIds = teamEventTypes.map((e) => e.id)
      if (teamEtIds.length > 0) {
        await prisma.pageView.deleteMany({ where: { eventTypeId: { in: teamEtIds } } })
        await prisma.booking.deleteMany({ where: { eventTypeId: { in: teamEtIds } } })
        await prisma.eventType.deleteMany({ where: { id: { in: teamEtIds } } })
      }
      await prisma.teamMember.deleteMany({ where: { teamId: { in: teamIds } } })
      await prisma.team.deleteMany({ where: { id: { in: teamIds } } })
    }

    // Remove from other teams
    await prisma.teamMember.deleteMany({ where: { userId } })

    // Delete bookings (as host)
    await prisma.booking.deleteMany({ where: { hostId: userId } })

    // Delete event types and page views
    const userEventTypes = await prisma.eventType.findMany({ where: { userId }, select: { id: true } })
    const etIds = userEventTypes.map((e) => e.id)
    if (etIds.length > 0) {
      await prisma.pageView.deleteMany({ where: { eventTypeId: { in: etIds } } })
    }
    await prisma.eventType.deleteMany({ where: { userId } })

    // Delete availability & overrides
    await prisma.availability.deleteMany({ where: { userId } })
    await prisma.dateOverride.deleteMany({ where: { userId } })

    // Delete API keys & linking tokens
    await prisma.apiKey.deleteMany({ where: { userId } })
    await prisma.linkingToken.deleteMany({ where: { userId } })

    // Delete sessions & accounts
    await prisma.session.deleteMany({ where: { userId } })
    await prisma.account.deleteMany({ where: { userId } })

    // Finally delete the user
    await prisma.user.delete({ where: { id: userId } })

    apiLogger.info("User data deleted successfully (GDPR)", { userId })

    return NextResponse.json({
      success: true,
      message: "All your data has been permanently deleted. This action cannot be undone.",
      deletedAt: new Date().toISOString(),
      userId,
    })
  } catch (error) {
    apiLogger.error("Error deleting user data", error)
    return NextResponse.json({ error: "Failed to delete account. Please try again or contact support." }, { status: 500 })
  }
}
