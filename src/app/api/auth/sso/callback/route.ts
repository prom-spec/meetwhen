import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { SAML } from "@node-saml/node-saml"
// POST /api/auth/sso/callback — handle SAML assertion response
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const samlResponse = formData.get("SAMLResponse") as string

    if (!samlResponse) {
      return NextResponse.redirect(new URL("/login?error=SSOFailed", request.url))
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://letsmeet.link"

    // We need to try all enabled SSO configs to find which IdP sent this
    // In practice, RelayState or the response issuer would identify it
    const ssoConfigs = await prisma.sSOConfig.findMany({
      where: { enabled: true },
    })

    let profile: { email?: string; firstName?: string; lastName?: string } | null = null

    for (const config of ssoConfigs) {
      try {
        const saml = new SAML({
          entryPoint: config.entryPoint,
          issuer: `${baseUrl}/api/auth/sso/metadata`,
          callbackUrl: `${baseUrl}/api/auth/sso/callback`,
          idpCert: config.cert,
          wantAssertionsSigned: false,
          wantAuthnResponseSigned: false,
        })

        const { profile: samlProfile } = await saml.validatePostResponseAsync({
          SAMLResponse: samlResponse,
        })

        if (samlProfile) {
          const email =
            samlProfile.nameID ||
            (samlProfile as Record<string, unknown>)["email"] as string ||
            (samlProfile as Record<string, unknown>)[
              "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
            ] as string

          const firstName =
            (samlProfile as Record<string, unknown>)["firstName"] as string ||
            (samlProfile as Record<string, unknown>)[
              "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
            ] as string || ""

          const lastName =
            (samlProfile as Record<string, unknown>)["lastName"] as string ||
            (samlProfile as Record<string, unknown>)[
              "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
            ] as string || ""

          if (email) {
            profile = { email: email.toLowerCase(), firstName, lastName }
            break
          }
        }
      } catch {
        // This config didn't match, try next
        continue
      }
    }

    if (!profile?.email) {
      return NextResponse.redirect(new URL("/login?error=SSOFailed", request.url))
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: profile.email },
    })

    if (!user) {
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || undefined
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name,
          emailVerified: new Date(),
        },
      })
    }

    // Create a session
    const sessionToken = crypto.randomUUID()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    })

    // Set the session cookie and redirect
    const useSecure = baseUrl.startsWith("https")
    const cookieName = useSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token"

    const response = NextResponse.redirect(new URL("/dashboard", request.url))
    response.cookies.set(cookieName, sessionToken, {
      expires,
      httpOnly: true,
      sameSite: "lax",
      secure: useSecure,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("SSO callback error:", error)
    return NextResponse.redirect(new URL("/login?error=SSOFailed", request.url))
  }
}
