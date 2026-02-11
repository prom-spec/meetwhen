import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  
  // PrismaNeon v7+ accepts connectionString directly, creates pool internally
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter })
}

// Lazy singleton — avoids crashing during `next build` when DATABASE_URL isn't set
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

// Use a Proxy so that any property access on `prisma` triggers lazy init
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getPrismaClient(), prop)
  },
})

export default prisma
