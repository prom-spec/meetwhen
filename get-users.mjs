import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("DATABASE_URL not set")
  process.exit(1)
}
const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({ adapter })

const users = await prisma.user.findMany({ select: { id: true, email: true, username: true } })
console.log(JSON.stringify(users, null, 2))
await prisma.$disconnect()
