"use client"

import { useState } from "react"
import Link from "next/link"

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-600 hover:text-gray-900"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg z-50">
          <div className="px-4 py-3 space-y-3">
            <Link href="/pricing" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">
              Pricing
            </Link>
            <Link href="/blog" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">
              Blog
            </Link>
            <Link href="/alternatives/calendly" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">
              Calendly Alternative
            </Link>
            <Link href="/mcp" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">
              MCP for AI
            </Link>
            <Link href="/about" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">
              About
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">
              Sign in
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="block text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] px-4 py-2 rounded-lg transition-colors text-center">
              Start scheduling free
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
