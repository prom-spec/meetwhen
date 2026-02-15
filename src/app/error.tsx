"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-[#1a1a2e] mb-2">Something went wrong</h1>
      <p className="text-gray-600 mb-8">Don&apos;t worry, your bookings are safe. Try refreshing the page.</p>
      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
