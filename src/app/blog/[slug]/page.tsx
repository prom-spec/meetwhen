import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { posts } from "../data";
import MobileNav from "@/components/MobileNav";
import { ArrowLeft } from "lucide-react";
import { CalendlyFreeArticle, AiSchedulingArticle, TrueCostArticle, McpAgentBookingArticle, FeaturesYouDontNeedArticle } from "./articles";

interface Props {
  params: Promise<{ slug: string }>;
}

const articleComponents: Record<string, () => React.JSX.Element> = {
  "calendly-free-plan-isnt-free": CalendlyFreeArticle,
  "ai-powered-scheduling-setup": AiSchedulingArticle,
  "true-cost-calendly-vs-letsmeet": TrueCostArticle,
  "mcp-ai-agent-booking": McpAgentBookingArticle,
  "5-scheduling-features-you-dont-need": FeaturesYouDontNeedArticle,
};

export async function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const ArticleContent = articleComponents[slug];
  if (!ArticleContent) notFound();

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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
              <time>{post.date}</time>
              <span>•</span>
              <span>{post.readTime}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] tracking-tight leading-tight">
              {post.title}
            </h1>
          </header>

          <div className="prose prose-gray prose-lg max-w-none prose-headings:text-[#1a1a2e] prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-a:text-[#0066FF] prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:my-4 prose-li:my-1">
            <ArticleContent />
          </div>
        </article>

        {/* Related posts */}
        <div className="mt-16 pt-8 border-t border-gray-100">
          <h3 className="text-lg font-bold text-[#1a1a2e] mb-6">More from the blog</h3>
          <div className="space-y-4">
            {posts
              .filter((p) => p.slug !== slug)
              .map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="block text-[#0066FF] hover:underline font-medium"
                >
                  {p.title} →
                </Link>
              ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/alternatives/calendly" className="text-sm text-gray-500 hover:text-[#0066FF]">Calendly alternative →</Link>
            <Link href="/compare/calendly-vs-letsmeet" className="text-sm text-gray-500 hover:text-[#0066FF]">Full comparison →</Link>
            <Link href="/pricing" className="text-sm text-gray-500 hover:text-[#0066FF]">View pricing →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
