import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { competitors } from "./data";
import MobileNav from "@/components/MobileNav";
import { Check, X, ArrowRight } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(competitors).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const comp = competitors[slug];
  if (!comp) return {};
  return {
    title: `Best ${comp.name} Alternative (2026) — letsmeet.link`,
    description: `Looking for a ${comp.name} alternative? letsmeet.link offers AI chat scheduling, MCP integration, and a generous free plan. Compare features and switch in minutes.`,
    openGraph: {
      title: `Best ${comp.name} Alternative — letsmeet.link`,
      description: `Compare letsmeet.link vs ${comp.name}. More features, lower price, AI-native.`,
    },
  };
}

export default async function AlternativePage({ params }: Props) {
  const { slug } = await params;
  const comp = competitors[slug];
  if (!comp) notFound();

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
              <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900">Blog</Link>
              <Link href="/login" className="text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] px-4 py-2 rounded-lg transition-colors">Get Started Free</Link>
            </div>
            <MobileNav />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Alternatives to {comp.name}</span>
        </nav>

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1a1a2e] tracking-tight">
            Looking for a <span className="text-[#0066FF]">{comp.name} alternative</span>?
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">{comp.tagline}</p>
          <p className="mt-4 text-xl font-semibold text-[#0066FF]">
            letsmeet.link gives you more features, AI scheduling, and costs 90% less.
          </p>
        </div>

        {/* Price comparison banner */}
        <div className="bg-blue-50 rounded-2xl p-8 mb-16 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide">{comp.name}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{comp.paidPrice}</p>
              <p className="text-sm text-gray-500 mt-1">{comp.freeplan}</p>
            </div>
            <div className="text-2xl font-bold text-gray-400">vs</div>
            <div>
              <p className="text-sm text-[#0066FF] uppercase tracking-wide font-medium">letsmeet.link</p>
              <p className="text-3xl font-bold text-[#0066FF] mt-1">$1/mo Pro</p>
              <p className="text-sm text-gray-500 mt-1">Free plan: 3 event types + AI chat</p>
            </div>
          </div>
        </div>

        {/* Feature comparison table */}
        <h2 className="text-2xl font-bold text-[#1a1a2e] mb-6">Feature Comparison</h2>
        <div className="overflow-x-auto mb-16">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Feature</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">{comp.name}</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-[#0066FF] bg-blue-50 rounded-t-lg">letsmeet.link</th>
              </tr>
            </thead>
            <tbody>
              {comp.features.map((f, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm text-gray-700">{f.name}</td>
                  <td className="text-center py-3 px-4">
                    {typeof f.them === "boolean" ? (
                      f.them ? <Check className="w-5 h-5 text-gray-400 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                    ) : (
                      <span className="text-sm text-gray-500">{f.them}</span>
                    )}
                  </td>
                  <td className="text-center py-3 px-4 bg-blue-50/50">
                    {typeof f.us === "boolean" ? (
                      f.us ? <Check className="w-5 h-5 text-[#0066FF] mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                    ) : (
                      <span className="text-sm font-medium text-[#0066FF]">{f.us}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Why switch */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Why people leave {comp.name}</h3>
            <ul className="space-y-3">
              {comp.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0066FF] mb-4">Why they choose letsmeet.link</h3>
            <ul className="space-y-3">
              {comp.ourAdvantages.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-[#0066FF] flex-shrink-0 mt-0.5" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#1a1a2e] rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to switch from {comp.name}?
          </h2>
          <p className="text-gray-300 mb-8 max-w-lg mx-auto">
            Set up your scheduling page in under 2 minutes. No credit card needed.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 text-base font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors"
          >
            Start scheduling free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Internal links */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Compare other alternatives</h3>
          <div className="flex flex-wrap gap-3">
            {Object.values(competitors)
              .filter((c) => c.slug !== slug)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/alternatives/${c.slug}`}
                  className="text-sm text-[#0066FF] hover:underline"
                >
                  {c.name} alternative →
                </Link>
              ))}
            <Link href="/pricing" className="text-sm text-[#0066FF] hover:underline">View pricing →</Link>
            <Link href="/blog" className="text-sm text-[#0066FF] hover:underline">Read our blog →</Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-sm text-gray-500">© {new Date().getFullYear()} letsmeet.link</span>
            <div className="flex items-center gap-6">
              <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-700">Pricing</Link>
              <Link href="/about" className="text-sm text-gray-500 hover:text-gray-700">About</Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">Privacy</Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
