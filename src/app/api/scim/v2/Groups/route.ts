// @ts-nocheck
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateSCIM, scimError, scimListResponse } from "@/lib/scim-auth"

function formatTeamGroup(group: { id: string; name: string; members?: { userId: string }[] }) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
    id: group.id,
    displayName: group.name,
    members: (group.members || []).map((m) => ({
      value: m.userId,
      $ref: `../Users/${m.userId}`,
    })),
    meta: { resourceType: "Group" },
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateSCIM(request)
  if (!auth) return scimError(401, "Unauthorized")

  const groups = await prisma.teamGroup.findMany({
    where: { teamId: auth.teamId },
    include: { members: { select: { userId: true } } },
  })

  return scimListResponse(
    "urn:ietf:params:scim:schemas:core:2.0:Group",
    groups.map(formatTeamGroup)
  )
}

export async function POST(request: NextRequest) {
  const auth = await authenticateSCIM(request)
  if (!auth) return scimError(401, "Unauthorized")

  const body = await request.json()
  const displayName = body.displayName
  if (!displayName) return scimError(400, "displayName is required")

  const group = await prisma.teamGroup.create({
    data: { teamId: auth.teamId, name: displayName },
    include: { members: { select: { userId: true } } },
  })

  // Add members if provided
  if (body.members?.length) {
    for (const m of body.members) {
      try {
        await prisma.teamGroupMember.create({
          data: { groupId: group.id, userId: m.value },
        })
      } catch { /* skip invalid */ }
    }
  }

  const updated = await prisma.teamGroup.findUnique({
    where: { id: group.id },
    include: { members: { select: { userId: true } } },
  })

  return Response.json(formatTeamGroup(updated!), { status: 201 })
}
