import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateSCIM,
  scimError,
  scimListResponse,
  formatUserResource,
} from "@/lib/scim-auth";
import { apiLogger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");

  const filter = request.nextUrl.searchParams.get("filter");
  const filterParam = filter;
  const members = await prisma.teamMember.findMany({
    where: {
      teamId: auth.teamId,
      ...(filterParam
        ? (() => {
            const match = filterParam.match(/userName\s+eq\s+"([^"]+)"/);
            return match ? { user: { email: match[1] } } : { userId: "__none__" };
          })()
        : {}),
    },
    include: { user: true },
  });
  const users = members.map((m) => m.user);

  return scimListResponse(
    "urn:ietf:params:scim:schemas:core:2.0:User",
    users.map(formatUserResource)
  );
}

export async function POST(request: NextRequest) {
  const auth = await authenticateSCIM(request);
  if (!auth) return scimError(401, "Unauthorized");

  const body = await request.json();
  const email = body.userName || body.emails?.[0]?.value;
  if (!email) return scimError(400, "userName or emails required");

  const givenName = body.name?.givenName || "";
  const familyName = body.name?.familyName || "";
  const name = [givenName, familyName].filter(Boolean).join(" ") || null;

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name },
    });
  }

  // Add to team if not already a member
  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: auth.teamId, userId: user.id } },
  });
  if (!existing) {
    await prisma.teamMember.create({
      data: { teamId: auth.teamId, userId: user.id, role: "MEMBER" },
    });
  }

  return Response.json(formatUserResource(user), { status: 201 });
}
