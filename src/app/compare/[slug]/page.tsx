import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { comparisons } from "./data";
import MobileNav from "@/components/MobileNav";
import { Check, X, Trophy, ArrowRight, Minus } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(comparisons).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const comp = comparisons[slug];
  if (!comp) return {};
  return {
    title: comp.title,
    description: comp.description,
    openGraph: { title: comp.title, description: comp.description },
  };
}

function FeatureCell({ value, winner, side }: { value: string | boolean; winner: string; side: "left" | "right" }) {
  const isWinner = winner === side;
  if (typeof value === "boolean") {
    return value ? (
      <Check className={`w-5 h-5 mx-auto ${isWinner ? "text-green-500" : "text-gray-400"}`} />
    ) : (
      <X className="w-5 h-5 mx-auto text-gray-300" />
    );
  }
  return (
    <span className={`text-sm ${isWinner ? "font-semibold text-[#0066FF]" : "text-gray-600"}`}>
      {value}
    </span>
  );
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const comp = comparisons[slug];
  if (!comp) notFound();

  // Count wins
  let leftWins = 0, rightWins = 0;
  comp.categories.forEach((cat) =>
    cat.features.forEach((f) => {
      if (f.winner === "left") leftWins++;
      if (f.winner === "right") rightWins++;
    })
  );

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
          <span className="text-gray-900">{comp.leftName} vs {comp.rightName}</span>
        </nav>

        <h1 className="text-4xl sm:text-5xl font-bold text-[#1a1a2e] tracking-tight text-center mb-6">
          {comp.leftName} <span className="text-gray-400">vs</span>{" "}
          <span className="text-[#0066FF]">{comp.rightName}</span>
        </h1>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">{comp.description}</p>

        {/* Score banner */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-12 flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-sm text-gray-500">{comp.leftName}</p>
            <p className="text-3xl font-bold text-gray-700">{leftWins}</p>
            <p className="text-xs text-gray-400">wins</p>
          </div>
          <Trophy className="w-8 h-8 text-[#0066FF]" />
          <div className="text-center">
            <p className="text-sm text-[#0066FF] font-medium">{comp.rightName}</p>
            <p className="text-3xl font-bold text-[#0066FF]">{rightWins}</p>
            <p className="text-xs text-gray-400">wins</p>
          </div>
        </div>

        {/* Categories */}
        {comp.categories.map((cat, ci) => (
          <div key={ci} className="mb-10">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-4">{cat.name}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 w-1/3">Feature</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 w-1/4">{comp.leftName}</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-[#0066FF] w-1/4 bg-blue-50/50">{comp.rightName}</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 w-16">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.features.map((f, fi) => (
                    <tr key={fi} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-700">{f.name}</td>
                      <td className="text-center py-3 px-4">
                        <FeatureCell value={f.left} winner={f.winner} side="left" />
                      </td>
                      <td className="text-center py-3 px-4 bg-blue-50/30">
                        <FeatureCell value={f.right} winner={f.winner} side="right" />
                      </td>
                      <td className="text-center py-3 px-4">
                        {f.winner === "right" ? (
                          <span className="inline-block bg-blue-100 text-[#0066FF] text-xs font-medium px-2 py-0.5 rounded-full">✓</span>
                        ) : f.winner === "left" ? (
                          <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">✓</span>
                        ) : (
                          <Minus className="w-4 h-4 text-gray-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Verdict */}
        <div className="bg-blue-50 rounded-2xl p-8 mb-12">
          <h2 className="text-xl font-bold text-[#1a1a2e] mb-3">The Verdict</h2>
          <p className="text-gray-700">{comp.verdict}</p>
        </div>

        {/* CTA */}
        <div className="bg-[#1a1a2e] rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Try letsmeet.link free</h2>
          <p className="text-gray-300 mb-8">Set up in 2 minutes. No credit card required.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 text-base font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors"
          >
            Start scheduling free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Internal links */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-4">More comparisons</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(comparisons)
              .filter(([k]) => k !== slug)
              .map(([k, v]) => (
                <Link key={k} href={`/compare/${k}`} className="text-sm text-[#0066FF] hover:underline">
                  {v.leftName} vs {v.rightName} →
                </Link>
              ))}
            <Link href="/alternatives/calendly" className="text-sm text-[#0066FF] hover:underline">Calendly alternatives →</Link>
            <Link href="/blog" className="text-sm text-[#0066FF] hover:underline">Read our blog →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
