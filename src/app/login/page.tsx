"use client"

import { signIn } from "next-auth/react"
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { AlertCircle, Loader2 } from "lucide-react"

// Map error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  OAuthAccountNotLinked: "This email is already linked to another sign-in method. Try signing in with your original method.",
  EmailSignin: "Unable to send the verification email. Please try again or use Google sign-in.",
  EmailCreateAccount: "Unable to create your account. Please try again.",
  Callback: "There was a problem with the sign-in. Please try again.",
  OAuthCallback: "There was a problem connecting to Google. Please try again.",
  OAuthCreateAccount: "Unable to create your account with Google. Please try again.",
  OAuthSignin: "Unable to sign in with Google. Please try again.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An error occurred during sign-in. Please try again.",
  Configuration: "Server configuration error. Please contact support.",
  AccessDenied: "Access denied. You don't have permission to sign in.",
  Verification: "The verification link has expired or is invalid. Please request a new one.",
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    
    setIsLoading(true)
    try {
      const result = await signIn("email", { 
        email: email.trim(), 
        callbackUrl: "/dashboard",
        redirect: false,
      })
      
      if (result?.error) {
        // Error will show via URL params on redirect
        window.location.href = `/login?error=${result.error}`
      } else {
        setEmailSent(true)
        // Redirect to verify page
        window.location.href = "/login/verify"
      }
    } catch {
      window.location.href = "/login?error=EmailSignin"
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true)
    signIn("google", { callbackUrl: "/dashboard" })
  }

  const errorMessage = error ? (errorMessages[error] || errorMessages.Default) : null

  if (emailSent) {
    return (
      <div className="text-center space-y-4">
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Check your email!</p>
          <p className="text-sm mt-1">We sent a sign-in link to {email}</p>
        </div>
        <button
          onClick={() => setEmailSent(false)}
          className="text-sm text-[#0066FF] hover:underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <>
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm">{errorMessage}</p>
            {error === "Verification" && (
              <p className="text-xs mt-1 text-red-600">
                Enter your email below to request a new link.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          className="w-full flex justify-center items-center py-3 px-4 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Sign in with your Google account to get started
        </p>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex">
          <Image
            src="/logo-full.svg"
            alt="letsmeet.link"
            width={140}
            height={34}
            priority
          />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo & Title */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Image
                  src="/logo.svg"
                  alt="letsmeet.link"
                  width={40}
                  height={40}
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">
              Welcome back
            </h1>
            <p className="mt-2 text-gray-500 text-sm">
              Sign in to your letsmeet.link account
            </p>
          </div>

          {/* Login Form */}
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-lg" />}>
            <LoginForm />
          </Suspense>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <span className="text-[#0066FF] font-medium">
              Sign up for free
            </span>
            <br />
            <span className="text-gray-400 mt-1 block">
              (Just click Continue with Google)
            </span>
          </p>
        </div>
      </main>

      {/* Bottom Branding */}
      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400">
          AI-powered scheduling by letsmeet.link
        </p>
      </footer>
    </div>
  )
}
