import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateSCIM,
  scimError,
  formatUserResource,
} from "@/lib/scim-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");
  const { id } = await context.params;

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: auth.teamId, userId: id } },
    include: { user: true },
  });
  if (!member) return scimError(404, "User not found");
  return Response.json(formatUserResource(member.user));
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");
  const { id } = await context.params;
  const body = await request.json();

  const givenName = body.name?.givenName || "";
  const familyName = body.name?.familyName || "";
  const name = [givenName, familyName].filter(Boolean).join(" ") || undefined;

  const user = await prisma.user.update({
    where: { id },
    data: { name, email: body.userName || undefined },
  });
  return Response.json(formatUserResource(user));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");
  const { id } = await context.params;
  const body = await request.json();

  // Handle SCIM PATCH operations
  for (const op of body.Operations || body.operations || []) {
    if (op.path === "active" && op.value === false) {
      // Deactivate = remove from team
      await prisma.teamMember.deleteMany({
        where: { teamId: auth.teamId, userId: id },
      });
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return scimError(404, "User not found");
      return Response.json({ ...formatUserResource(user), active: false });
    }
    if (op.op === "replace" && typeof op.value === "object") {
      if (op.value.active === false) {
        await prisma.teamMember.deleteMany({
          where: { teamId: auth.teamId, userId: id },
        });
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return scimError(404, "User not found");
        return Response.json({ ...formatUserResource(user), active: false });
      }
    }
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return scimError(404, "User not found");
  return Response.json(formatUserResource(user));
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");
  const { id } = await context.params;

  await prisma.teamMember.deleteMany({
    where: { teamId: auth.teamId, userId: id },
  });
  return new Response(null, { status: 204 });
}
