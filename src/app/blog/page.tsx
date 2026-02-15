import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { posts } from "./data";
import MobileNav from "@/components/MobileNav";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog — letsmeet.link",
  description: "Tips on scheduling, AI automation, and growing your business. From the team behind letsmeet.link.",
};

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Image src="/logo-full.svg" alt="letsmeet.link" width={140} height={34} priority />
            </Link>
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="/blog" className="text-sm font-medium text-gray-900">Blog</Link>
              <Link href="/login" className="text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] px-4 py-2 rounded-lg transition-colors">Get Started Free</Link>
            </div>
            <MobileNav />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-[#1a1a2e] mb-4">Blog</h1>
        <p className="text-gray-600 mb-12">Scheduling tips, AI automation guides, and product updates.</p>

        <div className="space-y-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block border border-gray-100 rounded-xl p-6 hover:border-[#0066FF]/20 hover:bg-blue-50/20 transition-colors"
            >
              <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                <time>{post.date}</time>
                <span>•</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="text-xl font-semibold text-[#1a1a2e] mb-2">{post.title}</h2>
              <p className="text-gray-600 text-sm mb-4">{post.description}</p>
              <span className="inline-flex items-center gap-1 text-sm text-[#0066FF] font-medium">
                Read more <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-sm text-gray-500">© {new Date().getFullYear()} letsmeet.link</span>
            <div className="flex items-center gap-6">
              <Link href="/alternatives/calendly" className="text-sm text-gray-500 hover:text-gray-700">Calendly Alternative</Link>
              <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-700">Pricing</Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
