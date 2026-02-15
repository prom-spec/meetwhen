import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { useCases } from "./data";
import MobileNav from "@/components/MobileNav";
import InteractiveDemo from "@/components/InteractiveDemo";
import { Check, ArrowRight, AlertCircle } from "lucide-react";

const useCaseDemoConfig: Record<string, { variant: "booking" | "ai-chat" | "comparison" | "calculator" | "team"; persona?: string }> = {
  freelancers: { variant: "booking", persona: "Discovery Call" },
  consultants: { variant: "ai-chat", persona: "a consulting session" },
  coaches: { variant: "booking", persona: "Coaching Session" },
  sales: { variant: "team" },
  "ai-agents": { variant: "ai-chat", persona: "an API-scheduled meeting" },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(useCases).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const uc = useCases[slug];
  if (!uc) return {};
  return {
    title: `Scheduling for ${uc.name} — letsmeet.link`,
    description: `${uc.subheadline} Free scheduling tool with AI chat and MCP integration.`,
    openGraph: {
      title: `Scheduling for ${uc.name} — letsmeet.link`,
      description: uc.subheadline,
    },
  };
}

export default async function UseCasePage({ params }: Props) {
  const { slug } = await params;
  const uc = useCases[slug];
  if (!uc) notFound();

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
        <nav className="text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/use-cases/freelancers" className="hover:text-gray-700">Use Cases</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900">{uc.name}</span>
        </nav>

        {/* Hero */}
        <div className="text-center mb-16">
          <span className="inline-block bg-blue-50 text-[#0066FF] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            For {uc.name}
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1a1a2e] tracking-tight">{uc.headline}</h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">{uc.subheadline}</p>
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3 text-base font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors"
            >
              {uc.cta} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Pain points */}
        <div className="bg-red-50/50 rounded-2xl p-8 mb-16">
          <h2 className="text-xl font-bold text-[#1a1a2e] mb-6">Sound familiar?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {uc.painPoints.map((p, i) => (
              <div key={i} className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{p}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Solutions */}
        <h2 className="text-2xl font-bold text-[#1a1a2e] mb-8 text-center">Here&apos;s how letsmeet.link helps</h2>
        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          {uc.solutions.map((s, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-6 hover:border-[#0066FF]/20 hover:bg-blue-50/30 transition-colors">
              <h3 className="text-lg font-semibold text-[#1a1a2e] mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600">{s.description}</p>
            </div>
          ))}
        </div>

        {/* Features list */}
        <div className="bg-gray-50 rounded-2xl p-8 mb-16">
          <h2 className="text-xl font-bold text-[#1a1a2e] mb-6">Key features for {uc.name.toLowerCase()}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {uc.features.map((f, i) => (
              <div key={i} className="flex gap-3 items-center">
                <Check className="w-4 h-4 text-[#0066FF] flex-shrink-0" />
                <span className="text-sm text-gray-700">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Demo */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2 text-center">
            Try it yourself
          </h2>
          <p className="text-gray-500 text-sm text-center mb-4">
            See how {uc.name.toLowerCase()} use letsmeet.link to schedule faster
          </p>
          <InteractiveDemo
            variant={useCaseDemoConfig[slug]?.variant || "booking"}
            persona={useCaseDemoConfig[slug]?.persona}
          />
        </div>

        {/* Pricing nudge */}
        <div className="text-center mb-16">
          <p className="text-gray-500 mb-2">All of this is included in the free plan.</p>
          <p className="text-gray-500">
            Need more?{" "}
            <Link href="/pricing" className="text-[#0066FF] hover:underline font-medium">
              Pro starts at $1/mo
            </Link>
          </p>
        </div>

        {/* CTA */}
        <div className="bg-[#1a1a2e] rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{uc.cta}</h2>
          <p className="text-gray-300 mb-8">Set up in 2 minutes. No credit card required.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 text-base font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors"
          >
            Get started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Internal links */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-4">More use cases</h3>
          <div className="flex flex-wrap gap-3">
            {Object.values(useCases)
              .filter((u) => u.slug !== slug)
              .map((u) => (
                <Link key={u.slug} href={`/use-cases/${u.slug}`} className="text-sm text-[#0066FF] hover:underline">
                  For {u.name} →
                </Link>
              ))}
            <Link href="/alternatives/calendly" className="text-sm text-[#0066FF] hover:underline">Calendly alternative →</Link>
            <Link href="/blog/5-scheduling-features-you-dont-need" className="text-sm text-[#0066FF] hover:underline">Features you don't need →</Link>
            <Link href="/tools/meeting-cost-calculator" className="text-sm text-[#0066FF] hover:underline">Meeting cost calculator →</Link>
            <Link href="/pricing" className="text-sm text-[#0066FF] hover:underline">View pricing →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
