import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
import { apiLogger } from "@/lib/logger"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
