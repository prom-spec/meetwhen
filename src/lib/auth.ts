import { PrismaAdapter } from "@auth/prisma-adapter"
import type { AdapterAccount } from "next-auth/adapters"
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import { prisma } from "./prisma"
import { authLogger } from "./logger"
import { cookies } from "next/headers"

// Startup check: ensure NEXTAUTH_SECRET is set in production
// Skip during build phase (next build sets NEXT_PHASE)
if (
  process.env.NODE_ENV === "production" &&
  !process.env.NEXTAUTH_SECRET &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  throw new Error("NEXTAUTH_SECRET must be set in production environment")
}

// Build authorization header for Resend API
function getResendAuthHeader(): string {
  const key = process.env.RESEND_API_KEY || ""
  return `Bearer ${key}`
}

// Custom email send using Resend HTTP API (Railway blocks SMTP)
async function sendVerificationRequest({
  identifier: email,
  url,
  provider: { from },
}: {
  identifier: string
  url: string
  provider: { from: string }
}) {
  const hasApiKey = !!process.env.RESEND_API_KEY
  
  authLogger.info("Attempting to send verification email", { email, hasApiKey })
  
  if (!hasApiKey) {
    authLogger.error("RESEND_API_KEY not configured - cannot send verification email")
    throw new Error("Email service not configured. Please contact support.")
  }

  // Resend requires a verified domain or use onboarding@resend.dev for testing
  // If EMAIL_FROM is not set or invalid, use the Resend test address
  const fromAddress = from && from.includes("@") && !from.includes("example.com")
    ? from 
    : "letsmeet.link <onboarding@resend.dev>"
  
  authLogger.debug("Sending email", { fromAddress, toEmail: email })

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getResendAuthHeader(),
      },
      body: JSON.stringify({
        from: fromAddress,
        to: email,
        subject: "Sign in to letsmeet.link",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">Sign in to letsmeet.link</h1>
            </div>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Click the button below to sign in to your letsmeet.link account. This link will expire in 24 hours.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #0066FF; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
                Sign In to letsmeet.link
              </a>
            </div>
            <p style="color: #718096; font-size: 14px; line-height: 1.5; margin-top: 32px;">
              If you didn't request this email, you can safely ignore it. Only someone with access to your email can sign in.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            <p style="color: #a0aec0; font-size: 12px; text-align: center;">
              letsmeet.link - AI-Powered Scheduling
            </p>
          </div>
        `,
      }),
    })

    const responseData = await response.json()
    
    if (!response.ok) {
      authLogger.error("Resend API error", null, { 
        status: response.status, 
        statusText: response.statusText,
        error: responseData,
        email 
      })
      
      // Provide user-friendly error messages
      if (response.status === 401) {
        throw new Error("Email service authentication failed. Please contact support.")
      } else if (response.status === 422) {
        throw new Error("Invalid email address. Please check and try again.")
      } else if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.")
      } else {
        throw new Error("Failed to send verification email. Please try again later.")
      }
    }

    authLogger.info("Verification email sent successfully", { email, messageId: responseData.id })
  } catch (error) {
    if (error instanceof Error && error.message.includes("Email service")) {
      throw error // Re-throw our custom errors
    }
    authLogger.error("Failed to send verification email", error, { email })
    throw new Error("Failed to send verification email. Please try again later.")
  }
}

const prismaAdapter = PrismaAdapter(prisma)

export const authOptions: NextAuthOptions = {
  adapter: {
    ...prismaAdapter,
    // Override linkAccount to use upsert so re-auth updates tokens instead of failing
    linkAccount: (data: any) =>
      prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: data.provider,
            providerAccountId: data.providerAccountId,
          },
        },
        create: data as Parameters<typeof prisma.account.create>[0]["data"],
        update: {
          access_token: data.access_token,
          expires_at: data.expires_at,
          refresh_token: data.refresh_token ?? undefined,
          token_type: data.token_type,
          scope: data.scope,
          id_token: data.id_token,
          session_state: data.session_state as string | undefined,
        },
      }) as ReturnType<NonNullable<typeof prismaAdapter.linkAccount>>,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    // Email login temporarily disabled - needs verified domain in Resend
    // EmailProvider({
    //   from: process.env.EMAIL_FROM || "letsmeet.link <onboarding@resend.dev>",
    //   sendVerificationRequest,
    // }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
    verifyRequest: "/login/verify",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
    async signIn({ user, account, profile }) {
      authLogger.info("Sign-in attempt", { 
        provider: account?.provider,
        email: user.email,
        isNewUser: !user.id,
      })

      // Handle account linking mode
      if (account?.provider === "google") {
        const googleEmail = (profile as { email?: string })?.email || user.email
        
        try {
          const cookieStore = await cookies()
          const linkTokenValue = cookieStore.get("link_token")?.value

          if (linkTokenValue) {
            // Clear the cookie immediately
            cookieStore.delete("link_token")

            // Look up and validate the linking token from DB
            const linkingToken = await prisma.linkingToken.findUnique({
              where: { token: linkTokenValue },
            })

            // Delete the token (single-use) regardless of validity
            if (linkingToken) {
              await prisma.linkingToken.delete({ where: { id: linkingToken.id } })
            }

            // Validate: token must exist and not be expired
            if (!linkingToken || linkingToken.expiresAt < new Date()) {
              authLogger.warn("Invalid or expired linking token", { tokenExists: !!linkingToken })
              return "/dashboard/settings?error=link_expired"
            }

            const linkMode = linkingToken.userId

            // Check if this Google account is already linked to ANY user
            const existingAccount = await prisma.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              select: { userId: true },
            })

            if (existingAccount) {
              if (existingAccount.userId === linkMode) {
                // Already linked to this user — just allow sign-in
                return true
              }
              // Linked to a different user — reject
              authLogger.warn("Account link rejected: Google account already belongs to another user", {
                googleEmail,
                existingUserId: existingAccount.userId,
                requestingUserId: linkMode,
              })
              return "/dashboard/settings?error=account_already_linked"
            }

            // Link the new Google account to the existing user
            await prisma.account.create({
              data: {
                userId: linkMode,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token as string | undefined,
                session_state: account.session_state,
                email: googleEmail,
              },
            })

            authLogger.info("Account linked successfully", {
              userId: linkMode,
              googleEmail,
              provider: account.provider,
            })

            // Redirect to settings instead of creating a new user
            return "/dashboard/settings?linked=true"
          }
        } catch (error) {
          authLogger.error("Error in link mode handling", error)
          // Fall through to normal sign-in
        }
      }
      
      // Update existing account tokens and scope on re-sign-in
      // NextAuth's PrismaAdapter doesn't update tokens for existing accounts
      if (account?.provider === "google" && user.id) {
        const googleEmail = (profile as { email?: string })?.email || user.email
        try {
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            select: { id: true },
          })

          if (existingAccount) {
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: {
                access_token: account.access_token,
                expires_at: account.expires_at,
                refresh_token: account.refresh_token ?? undefined,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token as string | undefined,
                session_state: account.session_state,
                email: googleEmail,
              },
            })
            authLogger.info("Updated existing account tokens/scope on re-sign-in", {
              accountId: existingAccount.id,
              hasRefreshToken: !!account.refresh_token,
              scope: account.scope,
            })
          }
        } catch (error) {
          authLogger.error("Failed to update account tokens on re-sign-in", error)
        }
      }

      // Generate username for existing users who don't have one
      if (user.id) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, username: true, name: true, email: true }
          })
          
          if (existingUser && !existingUser.username) {
            let baseUsername = ""
            
            if (existingUser.name) {
              baseUsername = existingUser.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
                .substring(0, 20)
            }
            
            if (!baseUsername && existingUser.email) {
              baseUsername = existingUser.email
                .split("@")[0]
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
                .substring(0, 20)
            }
            
            if (!baseUsername) baseUsername = "user"
            
            let username = baseUsername
            let suffix = 1
            while (true) {
              const existing = await prisma.user.findUnique({ 
                where: { username },
                select: { id: true }
              })
              if (!existing || existing.id === user.id) break
              username = `${baseUsername}-${suffix}`
              suffix++
              if (suffix > 100) {
                username = `${baseUsername}-${Math.random().toString(36).substring(2, 8)}`
                break
              }
            }
            
            await prisma.user.update({
              where: { id: user.id },
              data: { username }
            })
            
            authLogger.info("Generated username for existing user", { visitorId: user.id, username })
          }
        } catch (error) {
          authLogger.error("Failed to generate username for existing user", error, { visitorId: user.id })
        }
      }

      // Ensure the Google account record stores the email from the profile
      if (account?.provider === "google" && account.providerAccountId) {
        const googleEmail = (profile as { email?: string })?.email || user.email
        if (googleEmail) {
          try {
            await prisma.account.update({
              where: {
                provider_providerAccountId: {
                  provider: "google",
                  providerAccountId: account.providerAccountId,
                },
              },
              data: { email: googleEmail },
            })
          } catch (e) {
            authLogger.error("Failed to update account email", e)
          }
        }
      }
      
      return true
    },
  },
  events: {
    async signIn({ user, account }) {
      authLogger.info("User signed in successfully", { 
        visitorId: user.id, 
        provider: account?.provider,
        email: user.email,
      })
    },
    async signOut({ session }) {
      authLogger.info("User signed out", { visitorId: (session as { userId?: string })?.userId })
    },
    async createUser({ user }) {
      authLogger.info("New user created", { visitorId: user.id, email: user.email })
      
      // Create default availability based on user's timezone
      try {
        const { getDefaultWorkDays } = await import("@/lib/holidays")
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { timezone: true } })
        const timezone = dbUser?.timezone || "UTC"
        const workDays = getDefaultWorkDays(timezone)
        
        await prisma.availability.createMany({
          data: workDays.map((day) => ({
            userId: user.id,
            dayOfWeek: day,
            startTime: "09:00",
            endTime: "17:00",
          })),
        })
        authLogger.info("Created default availability", { visitorId: user.id, timezone, workDays })
      } catch (error) {
        authLogger.error("Failed to create default availability", error, { visitorId: user.id })
      }

      // Generate a unique username for new users
      try {
        let baseUsername = ""
        
        // Try to generate from name first
        if (user.name) {
          baseUsername = user.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .substring(0, 20)
        }
        
        // Fall back to email prefix
        if (!baseUsername && user.email) {
          baseUsername = user.email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .substring(0, 20)
        }
        
        // Fall back to random string
        if (!baseUsername) {
          baseUsername = "user"
        }
        
        // Check if username exists and add suffix if needed
        let username = baseUsername
        let suffix = 1
        while (true) {
          const existing = await prisma.user.findUnique({ 
            where: { username },
            select: { id: true }
          })
          if (!existing || existing.id === user.id) break
          username = `${baseUsername}-${suffix}`
          suffix++
          if (suffix > 100) {
            // Fallback to random suffix
            username = `${baseUsername}-${Math.random().toString(36).substring(2, 8)}`
            break
          }
        }
        
        // Update user with generated username
        await prisma.user.update({
          where: { id: user.id },
          data: { username }
        })
        
        authLogger.info("Generated username for new user", { visitorId: user.id, username })
      } catch (error) {
        authLogger.error("Failed to generate username", error, { visitorId: user.id })
      }
    },
    async linkAccount({ user, account }) {
      authLogger.info("Account linked", { visitorId: user.id, provider: account.provider })
      
      // Store the email associated with this OAuth account
      if (account.provider === "google") {
        try {
          // Get user's email to store on the account record
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { email: true },
          })
          if (dbUser?.email) {
            await prisma.account.updateMany({
              where: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
              data: { email: dbUser.email },
            })
          }
        } catch (error) {
          authLogger.error("Failed to store email on account", error)
        }
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
}
