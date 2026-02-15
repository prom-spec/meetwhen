import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <Image src="/logo.svg" alt="letsmeet.link" width={48} height={48} className="mb-6" />
      <h1 className="text-6xl font-bold text-[#1a1a2e] mb-2">404</h1>
      <p className="text-lg text-gray-600 mb-8">This page doesn&apos;t exist. Maybe the meeting was cancelled? 😅</p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors"
        >
          Go to homepage
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Start scheduling free
        </Link>
      </div>
      <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
        <Link href="/blog" className="hover:text-[#0066FF]">Blog</Link>
        <Link href="/pricing" className="hover:text-[#0066FF]">Pricing</Link>
        <Link href="/alternatives/calendly" className="hover:text-[#0066FF]">Calendly Alternative</Link>
        <Link href="/tools/meeting-cost-calculator" className="hover:text-[#0066FF]">Meeting Cost Calculator</Link>
      </div>
    </div>
  );
}
