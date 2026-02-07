import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import { prisma } from "./prisma"
import { authLogger } from "./logger"

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
    : "MeetWhen <onboarding@resend.dev>"
  
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
        subject: "Sign in to MeetWhen",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">Sign in to MeetWhen</h1>
            </div>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Click the button below to sign in to your MeetWhen account. This link will expire in 24 hours.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #0066FF; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
                Sign In to MeetWhen
              </a>
            </div>
            <p style="color: #718096; font-size: 14px; line-height: 1.5; margin-top: 32px;">
              If you didn't request this email, you can safely ignore it. Only someone with access to your email can sign in.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            <p style="color: #a0aec0; font-size: 12px; text-align: center;">
              MeetWhen - AI-Powered Scheduling
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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM || "MeetWhen <onboarding@resend.dev>",
      sendVerificationRequest,
    }),
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
    async signIn({ user, account }) {
      authLogger.info("Sign-in attempt", { 
        provider: account?.provider,
        email: user.email,
        isNewUser: !user.id,
      })
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
    },
    async linkAccount({ user, account }) {
      authLogger.info("Account linked", { visitorId: user.id, provider: account.provider })
    },
  },
  debug: process.env.NODE_ENV === "development",
}
