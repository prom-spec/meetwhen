import { prisma } from "@/lib/prisma";

export async function authenticateSCIM(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  if (!token) return null;

  const scimToken = await prisma.sCIMToken.findUnique({
    where: { token },
    include: { team: true },
  });
  return scimToken;
}

export function scimError(status: number, detail: string) {
  return Response.json(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail,
      status,
    },
    { status }
  );
}

export function scimListResponse(
  schema: string,
  resources: unknown[],
  totalResults?: number
) {
  return Response.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: totalResults ?? resources.length,
    itemsPerPage: resources.length,
    startIndex: 1,
    Resources: resources,
  });
}

export function formatUserResource(user: {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
}) {
  const [givenName, ...rest] = (user.name || "").split(" ");
  const familyName = rest.join(" ") || "";
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email,
    name: { givenName, familyName },
    emails: [{ value: user.email, primary: true }],
    displayName: user.name || user.email,
    active: true,
    meta: {
      resourceType: "User",
    },
  };
}

export function formatGroupResource(team: {
  id: string;
  name: string;
  members?: { userId: string }[];
}) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
    id: team.id,
    displayName: team.name,
    members: (team.members || []).map((m) => ({
      value: m.userId,
      $ref: `../Users/${m.userId}`,
    })),
    meta: {
      resourceType: "Group",
    },
  };
}
