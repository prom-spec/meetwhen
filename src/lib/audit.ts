import prisma from "@/lib/prisma"

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
  ipAddress?: string | null
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: ipAddress || null,
      },
    })
  } catch (error) {
    // Never let audit logging break the main flow
    console.error("Failed to write audit log:", error)
  }
}
