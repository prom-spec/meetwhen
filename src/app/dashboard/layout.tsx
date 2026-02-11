"use client"

import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { Menu, X, Loader2, ChevronDown } from "lucide-react"
import ChatInterface from "@/components/ChatInterface"

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/event-types", label: "Event Types" },
  { href: "/dashboard/availability", label: "Availability" },
  { href: "/dashboard/bookings", label: "Bookings" },
]

const moreLinks = [
  { href: "/dashboard/polls", label: "Polls" },
  { href: "/dashboard/teams", label: "Teams" },
  { href: "/dashboard/routing", label: "Routing" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/embed", label: "Embed" },
]

const navLinks = [...primaryLinks, ...moreLinks, { href: "/dashboard/settings", label: "Settings" }]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setMoreOpen(false)
  }, [pathname])

  // Close "More" dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  const isActiveLink = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Desktop Nav */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard">
                  <Image
                    src="/logo-full.svg"
                    alt="letsmeet.link"
                    width={130}
                    height={32}
                    priority
                  />
                </Link>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:ml-6 md:flex md:items-center md:space-x-1 lg:ml-8 lg:space-x-2">
                {primaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActiveLink(link.href)
                        ? "border-[#0066FF] text-[#0066FF]"
                        : "border-transparent text-gray-500 hover:text-[#0066FF] hover:border-[#0066FF]/30"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

                {/* More dropdown */}
                <div className="relative" ref={moreRef}>
                  <button
                    onClick={() => setMoreOpen(!moreOpen)}
                    className={`inline-flex items-center gap-1 px-3 pt-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      moreLinks.some((l) => isActiveLink(l.href))
                        ? "border-[#0066FF] text-[#0066FF]"
                        : "border-transparent text-gray-500 hover:text-[#0066FF] hover:border-[#0066FF]/30"
                    }`}
                  >
                    More
                    <ChevronDown className={`w-4 h-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                  </button>
                  {moreOpen && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      {moreLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isActiveLink(link.href)
                              ? "text-[#0066FF] bg-blue-50"
                              : "text-gray-700 hover:bg-gray-50 hover:text-[#0066FF]"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href="/dashboard/settings"
                  className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActiveLink("/dashboard/settings")
                      ? "border-[#0066FF] text-[#0066FF]"
                      : "border-transparent text-gray-500 hover:text-[#0066FF] hover:border-[#0066FF]/30"
                  }`}
                >
                  Settings
                </Link>
              </div>
            </div>

            {/* Desktop Right Side - visible from md (768px) */}
            <div className="hidden md:flex md:items-center md:gap-4">
              <span className="text-sm text-gray-500 truncate max-w-[150px] lg:max-w-[200px]">
                {session.user?.email}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-gray-500 hover:text-gray-700 font-medium whitespace-nowrap"
              >
                Sign out
              </Link>
            </div>

            {/* Mobile menu button - visible below md (768px) */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0066FF]"
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu - visible below md (768px) */}
        <div className={`md:hidden ${mobileMenuOpen ? "block" : "hidden"}`}>
          <div className="pt-2 pb-3 space-y-1 bg-white border-b border-gray-200">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                  isActiveLink(link.href)
                    ? "border-[#0066FF] text-[#0066FF] bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200 bg-white">
            <div className="px-4">
              <p className="text-sm text-gray-500 truncate">{session.user?.email}</p>
            </div>
            <div className="mt-3 px-2">
              <Link
                href="/api/auth/signout"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      
      <ChatInterface />
    </div>
  )
}
