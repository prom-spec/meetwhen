import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { apiLogger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await request.json();
  if (!teamId) {
    return Response.json({ error: "teamId required" }, { status: 400 });
  }

  // Verify user is team owner or admin
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
  });
  const team = await prisma.team.findUnique({ where: { id: teamId } });

  if (!team) return Response.json({ error: "Team not found" }, { status: 404 });
  if (team.ownerId !== user.id && member?.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = `scim_${randomBytes(32).toString("hex")}`;

  // Upsert: delete old token if exists, create new
  await prisma.sCIMToken.deleteMany({ where: { teamId } });
  await prisma.sCIMToken.create({ data: { teamId, token } });

  return Response.json({ token });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await request.json();
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  await prisma.sCIMToken.deleteMany({ where: { teamId } });
  return Response.json({ ok: true });
}
