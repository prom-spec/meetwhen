import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-full.svg"
                alt="letsmeet.link"
                width={140}
                height={34}
                priority
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] px-4 py-2 rounded-lg transition-colors"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16 text-center lg:pt-32">
          {/* Logo Icon */}
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-blue-50 rounded-2xl">
              <Image
                src="/logo.svg"
                alt="letsmeet.link icon"
                width={64}
                height={64}
              />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1a1a2e] tracking-tight">
            Scheduling made
            <span className="text-[#0066FF]"> intelligent</span>
          </h1>
          
          {/* Tagline */}
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered scheduling that understands your availability. 
            Share your link, let invitees pick a time, and letsmeet.link handles the rest.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors shadow-sm"
            >
              Start for free
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              See how it works
            </Link>
          </div>

          {/* Trust Badge */}
          <p className="mt-6 text-sm text-gray-500">
            No credit card required • Free forever for individuals
          </p>
        </div>

        {/* Features Section */}
        <section id="features" className="py-20 border-t border-gray-100">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#1a1a2e]">
              Why choose letsmeet.link?
            </h2>
            <p className="mt-4 text-gray-600">
              Simple, smart, and designed for the way you work.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">AI-Powered</h3>
              <p className="text-gray-600 text-sm">
                Our AI learns your preferences and suggests optimal meeting times automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">Calendar Sync</h3>
              <p className="text-gray-600 text-sm">
                Connects with Google Calendar, Outlook, and more. Always shows real-time availability.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">Zero Back-and-Forth</h3>
              <p className="text-gray-600 text-sm">
                Share your link once. Invitees book instantly. No endless email chains.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="letsmeet.link"
                width={24}
                height={24}
              />
              <span className="text-sm text-gray-500">
                © {new Date().getFullYear()} letsmeet.link. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/about" className="text-sm text-gray-500 hover:text-gray-700">
                About
              </Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
