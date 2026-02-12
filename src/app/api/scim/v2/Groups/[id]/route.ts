import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateSCIM,
  scimError,
  formatGroupResource,
} from "@/lib/scim-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");
  const { id } = await context.params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!team || team.id !== auth.teamId)
    return scimError(404, "Group not found");

  return Response.json(formatGroupResource(team));
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");
  const { id } = await context.params;
  const body = await request.json();

  const team = await prisma.team.update({
    where: { id },
    data: { name: body.displayName || undefined },
    include: { members: true },
  });
  return Response.json(formatGroupResource(team));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");
  const { id } = await context.params;
  const body = await request.json();

  for (const op of body.Operations || body.operations || []) {
    if (op.op === "add" && op.path === "members") {
      const members = Array.isArray(op.value) ? op.value : [op.value];
      for (const m of members) {
        const userId = m.value;
        const existing = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: id, userId } },
        });
        if (!existing) {
          await prisma.teamMember.create({
            data: { teamId: id, userId, role: "MEMBER" },
          });
        }
      }
    }
    if (op.op === "remove" && op.path?.startsWith("members")) {
      const match = op.path.match(/members\[value eq "([^"]+)"\]/);
      if (match) {
        await prisma.teamMember.deleteMany({
          where: { teamId: id, userId: match[1] },
        });
      }
    }
  }

  const team = await prisma.team.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!team) return scimError(404, "Group not found");
  return Response.json(formatGroupResource(team));
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");

  // Don't actually delete the team, just acknowledge
  return new Response(null, { status: 204 });
}
