// @ts-nocheck
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateSCIM, scimError } from "@/lib/scim-auth"

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

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateSCIM(request)
  if (!auth) return scimError(401, "Unauthorized")
  const { id } = await params

  const group = await prisma.teamGroup.findFirst({
    where: { id, teamId: auth.teamId },
    include: { members: { select: { userId: true } } },
  })
  if (!group) return scimError(404, "Group not found")

  return Response.json(formatTeamGroup(group))
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateSCIM(request)
  if (!auth) return scimError(401, "Unauthorized")
  const { id } = await params

  const body = await request.json()
  const group = await prisma.teamGroup.findFirst({ where: { id, teamId: auth.teamId } })
  if (!group) return scimError(404, "Group not found")

  // Update name
  if (body.displayName) {
    await prisma.teamGroup.update({ where: { id }, data: { name: body.displayName } })
  }

  // Replace members
  if (body.members) {
    await prisma.teamGroupMember.deleteMany({ where: { groupId: id } })
    for (const m of body.members) {
      try {
        await prisma.teamGroupMember.create({ data: { groupId: id, userId: m.value } })
      } catch { /* skip */ }
    }
  }

  const updated = await prisma.teamGroup.findUnique({
    where: { id },
    include: { members: { select: { userId: true } } },
  })

  return Response.json(formatTeamGroup(updated!))
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateSCIM(request)
  if (!auth) return scimError(401, "Unauthorized")
  const { id } = await params

  const group = await prisma.teamGroup.findFirst({ where: { id, teamId: auth.teamId } })
  if (!group) return scimError(404, "Group not found")

  const body = await request.json()
  for (const op of body.Operations || []) {
    if (op.op === "add" && op.path === "members") {
      for (const m of op.value || []) {
        try {
          await prisma.teamGroupMember.create({ data: { groupId: id, userId: m.value } })
        } catch { /* already exists */ }
      }
    } else if (op.op === "remove" && op.path?.startsWith("members[value eq")) {
      const match = op.path.match(/value eq "([^"]+)"/)
      if (match) {
        await prisma.teamGroupMember.deleteMany({ where: { groupId: id, userId: match[1] } })
      }
    } else if (op.op === "replace" && op.path === "displayName") {
      await prisma.teamGroup.update({ where: { id }, data: { name: op.value } })
    }
  }

  const updated = await prisma.teamGroup.findUnique({
    where: { id },
    include: { members: { select: { userId: true } } },
  })

  return Response.json(formatTeamGroup(updated!))
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateSCIM(request)
  if (!auth) return scimError(401, "Unauthorized")
  const { id } = await params

  const group = await prisma.teamGroup.findFirst({ where: { id, teamId: auth.teamId } })
  if (!group) return scimError(404, "Group not found")

  await prisma.teamGroup.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
