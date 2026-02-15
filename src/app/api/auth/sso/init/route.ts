import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { SAML } from "@node-saml/node-saml"
import { apiLogger } from "@/lib/logger"

// POST /api/auth/sso/init — initiate SSO login
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const domain = email.split("@")[1]?.toLowerCase()
    if (!domain) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const ssoConfig = await prisma.sSOConfig.findUnique({
      where: { domain },
    })

    if (!ssoConfig || !ssoConfig.enabled) {
      return NextResponse.json(
        { error: "SSO is not configured for this domain" },
        { status: 404 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://letsmeet.link"

    const saml = new SAML({
      entryPoint: ssoConfig.entryPoint,
      issuer: `${baseUrl}/api/auth/sso/metadata`,
      callbackUrl: `${baseUrl}/api/auth/sso/callback`,
      idpCert: ssoConfig.cert,
      wantAssertionsSigned: false,
      wantAuthnResponseSigned: false,
    })

    const loginUrl = await saml.getAuthorizeUrlAsync("", undefined, {})

    return NextResponse.json({ redirectUrl: loginUrl })
  } catch (error) {
    apiLogger.error("SSO init error:", error)
    return NextResponse.json({ error: "Failed to initiate SSO" }, { status: 500 })
  }
}
