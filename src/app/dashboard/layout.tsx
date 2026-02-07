import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import Image from "next/image"
import ChatInterface from "@/components/ChatInterface"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard">
                  <Image
                    src="/logo-full.svg"
                    alt="MeetWhen"
                    width={130}
                    height={32}
                    priority
                  />
                </Link>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-[#0066FF] inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-[#0066FF]/30 text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/event-types"
                  className="text-gray-500 hover:text-[#0066FF] inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-[#0066FF]/30 text-sm font-medium transition-colors"
                >
                  Event Types
                </Link>
                <Link
                  href="/dashboard/availability"
                  className="text-gray-500 hover:text-[#0066FF] inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-[#0066FF]/30 text-sm font-medium transition-colors"
                >
                  Availability
                </Link>
                <Link
                  href="/dashboard/bookings"
                  className="text-gray-500 hover:text-[#0066FF] inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-[#0066FF]/30 text-sm font-medium transition-colors"
                >
                  Bookings
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="text-gray-500 hover:text-[#0066FF] inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-[#0066FF]/30 text-sm font-medium transition-colors"
                >
                  Analytics
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="text-gray-500 hover:text-[#0066FF] inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-[#0066FF]/30 text-sm font-medium transition-colors"
                >
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {session.user?.email}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <ChatInterface />
    </div>
  )
}
