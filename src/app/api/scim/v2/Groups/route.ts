import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateSCIM,
  scimError,
  scimListResponse,
  formatGroupResource,
} from "@/lib/scim-auth";

export async function GET(request: NextRequest) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");

  const team = await prisma.team.findUnique({
    where: { id: auth.teamId },
    include: { members: true },
  });
  if (!team) return scimError(404, "Team not found");

  return scimListResponse(
    "urn:ietf:params:scim:schemas:core:2.0:Group",
    [formatGroupResource(team)]
  );
}

export async function POST(request: NextRequest) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");

  // SCIM Groups map to the team itself; we don't create sub-groups
  // Return the existing team as the group
  const team = await prisma.team.findUnique({
    where: { id: auth.teamId },
    include: { members: true },
  });
  if (!team) return scimError(404, "Team not found");

  return Response.json(formatGroupResource(team), { status: 201 });
}
