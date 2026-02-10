"use client"

import Image from "next/image"
import Link from "next/link"
import { Mail } from "lucide-react"

export default function VerifyRequestPage() {
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
        <div className="w-full max-w-sm space-y-8 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 bg-blue-50 rounded-full">
              <Mail className="w-12 h-12 text-[#0066FF]" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">
              Check your email
            </h1>
            <p className="mt-4 text-gray-600">
              We&apos;ve sent you a magic link to sign in. Click the link in your email to continue.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800">
              <strong>Didn&apos;t receive the email?</strong>
            </p>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• The link expires in 24 hours</li>
            </ul>
          </div>

          {/* Back Link */}
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-[#0066FF] hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400">
          AI-powered scheduling by letsmeet.link
        </p>
      </footer>
    </div>
  )
}
