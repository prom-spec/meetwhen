"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Copy, Check, AlertCircle, Key } from "lucide-react";

interface ApiKeyInfo {
  hasKey: boolean;
  keyPrefix: string | null;
  fullKey: string | null; // only available right after generation
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-xs transition-colors"
      title={label || "Copy"}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ children, copyText }: { children: string; copyText?: string }) {
  return (
    <div className="relative">
      <pre className="p-4 pr-24 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
        {children}
      </pre>
      <CopyButton text={copyText || children} />
    </div>
  );
}

function ApiKeyNeededBanner() {
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-800">API key required</p>
        <p className="text-sm text-amber-700 mt-1">
          Generate an API key in{" "}
          <Link href="/dashboard/settings" className="text-amber-800 underline font-medium">
            Settings → Connect Your AI Agent
          </Link>{" "}
          first, then come back to copy the config.
        </p>
      </div>
    </div>
  );
}

export default function McpGuideContent() {
  const [apiKey, setApiKey] = useState<ApiKeyInfo>({ hasKey: false, keyPrefix: null, fullKey: null });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApiKeyStatus() {
      try {
        const res = await fetch("/api/settings/api-keys");
        if (res.ok) {
          const keys = await res.json();
          setIsLoggedIn(true);
          if (keys.length > 0) {
            const activeKey = keys.find((k: { revokedAt: string | null }) => !k.revokedAt);
            if (activeKey) {
              setApiKey({ hasKey: true, keyPrefix: activeKey.keyPrefix, fullKey: null });
            }
          }
        } else if (res.status === 401) {
          setIsLoggedIn(false);
        }
      } catch {
        // Not logged in or error — show generic snippets
      } finally {
        setLoading(false);
      }
    }
    fetchApiKeyStatus();
  }, []);

  const getApiKeyPlaceholder = () => {
    if (apiKey.fullKey) return apiKey.fullKey;
    if (apiKey.hasKey && apiKey.keyPrefix) return `${apiKey.keyPrefix}${"•".repeat(40)}`;
    return "YOUR_API_KEY";
  };

  const needsKeyWarning = isLoggedIn && !apiKey.hasKey;
  const hasUsableKey = apiKey.hasKey;
  const keyDisplay = getApiKeyPlaceholder();

  const httpConfig = `{
  "mcpServers": {
    "letsmeet": {
      "type": "http",
      "url": "https://www.letsmeet.link/api/mcp",
      "headers": {
        "Authorization": "Bearer ${keyDisplay}"
      }
    }
  }
}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <Link
              href="/login"
              className="text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] px-4 py-2 rounded-lg transition-colors"
            >
              Schedule with AI
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-[#0066FF] text-sm font-medium px-4 py-2 rounded-full mb-6">
            <span className="inline-block w-2 h-2 bg-[#0066FF] rounded-full animate-pulse" />
            For AI Agents
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6">
            Connect your AI to
            <br />
            <span className="text-[#0066FF]">letsmeet.link via MCP</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            The Model Context Protocol (MCP) lets AI agents use tools — like scheduling meetings.
            Connect your AI assistant and let it manage your calendar directly.
          </p>
        </div>

        <article className="prose prose-gray prose-lg max-w-none">
          {/* What is MCP */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">What is MCP?</h2>
            <p className="text-gray-600 leading-relaxed">
              <strong>Model Context Protocol (MCP)</strong> is an open standard that lets AI assistants
              use external tools. Think of it like giving your AI a set of abilities — in this case,
              the ability to check your calendar, find available times, and book meetings.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Instead of you switching between apps, your AI handles scheduling as part of the conversation.
              Say &quot;book a call with Sarah next Tuesday&quot; and it just happens.
            </p>
          </div>

          {/* HTTP Setup */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">Quick Setup</h2>

            <h3 className="text-xl font-semibold text-gray-900 !mt-0 mb-3 flex items-center gap-2">
              🌐 HTTP API (Recommended)
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Works with any MCP-compatible AI agent — Claude, ChatGPT, OpenClaw, and more.
            </p>

            {!loading && needsKeyWarning && <ApiKeyNeededBanner />}

            {!loading && !isLoggedIn && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <Key className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Sign in to get your config</p>
                  <p className="text-sm text-blue-700 mt-1">
                    <Link href="/login" className="text-blue-800 underline font-medium">Sign in</Link> and generate an API key — your config snippet will be pre-filled and ready to copy.
                  </p>
                </div>
              </div>
            )}

            {!loading && hasUsableKey && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">Your API key is included below</p>
                  <p className="text-sm text-green-700 mt-1">
                    Copy the config — your key ({apiKey.keyPrefix}…) is already in place. For the full key, check{" "}
                    <Link href="/dashboard/settings" className="text-green-800 underline font-medium">Settings</Link>.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {hasUsableKey ? "Copy this config into your MCP client:" : "1. Get your API key from Settings, then configure your MCP client:"}
                </p>
                <CodeBlock copyText={httpConfig}>{httpConfig}</CodeBlock>
              </div>
            </div>

            {/* Stdio */}
            <div className="mt-10 pt-10 border-t border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 !mt-0 mb-3 flex items-center gap-2">
                💻 Stdio Server (Advanced)
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                For local MCP clients like Claude Desktop. Requires the project source code.
              </p>
              <CodeBlock>{`{
  "mcpServers": {
    "letsmeet": {
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "env": {
        "DATABASE_URL": "your_database_url",
        "MCP_USER_ID": "your_user_id"
      }
    }
  }
}`}</CodeBlock>
            </div>
          </div>

          {/* Available Tools */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">Available Tools</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Once connected, your AI agent can use these tools:
            </p>
            <div className="space-y-3">
              {[
                { name: "get_event_types", desc: "List your meeting types (30-min call, coffee chat, etc.)" },
                { name: "get_bookings", desc: "See upcoming meetings and their details" },
                { name: "create_booking", desc: "Book a meeting at an available time" },
                { name: "cancel_booking", desc: "Cancel a scheduled meeting" },
                { name: "get_my_booking_link", desc: "Get your shareable booking URL" },
                { name: "find_user", desc: "Look up another user on the platform" },
                { name: "get_available_slots", desc: "Find open time slots for booking" },
                { name: "set_availability", desc: "Update your available hours" },
                { name: "add_date_override", desc: "Block a date or set custom hours" },
              ].map((tool) => (
                <div key={tool.name} className="flex gap-3 items-start">
                  <code className="text-xs bg-gray-100 text-[#0066FF] px-2 py-1 rounded font-mono flex-shrink-0 mt-0.5">{tool.name}</code>
                  <span className="text-sm text-gray-600">{tool.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Example Conversation */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">What It Looks Like</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Here&apos;s a real conversation with an AI agent connected to letsmeet.link:
            </p>
            <div className="space-y-4 bg-gray-50 rounded-lg p-6">
              <div className="flex gap-3">
                <span className="text-sm font-medium text-gray-500 w-12 flex-shrink-0">You:</span>
                <span className="text-sm text-gray-800">&quot;Book a 30-minute call with sarah@example.com next week&quot;</span>
              </div>
              <div className="flex gap-3">
                <span className="text-sm font-medium text-[#0066FF] w-12 flex-shrink-0">AI:</span>
                <span className="text-sm text-gray-800">I found Sarah on letsmeet.link. She has a &quot;Quick Call&quot; event type (30 min). She&apos;s free Tuesday at 2pm, Wednesday at 10am, and Thursday at 3pm. Which works?</span>
              </div>
              <div className="flex gap-3">
                <span className="text-sm font-medium text-gray-500 w-12 flex-shrink-0">You:</span>
                <span className="text-sm text-gray-800">&quot;Tuesday 2pm&quot;</span>
              </div>
              <div className="flex gap-3">
                <span className="text-sm font-medium text-[#0066FF] w-12 flex-shrink-0">AI:</span>
                <span className="text-sm text-gray-800">Done! ✅ Booked for Tuesday at 2:00 PM. Calendar invite sent to both of you.</span>
              </div>
            </div>
          </div>

          {/* Get Started */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">Get Started</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Ready to connect your AI agent? It takes under a minute.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0066FF] text-white rounded-lg font-medium hover:bg-[#0052cc] transition-colors text-sm no-underline"
              >
                Get your API key →
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm no-underline"
              >
                Create a free account
              </Link>
            </div>
          </div>
        </article>
      </main>

            {/* Related links */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Related reading</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/blog/mcp-ai-agent-booking" className="text-sm text-[#0066FF] hover:underline">MCP: Let Your AI Agent Book Meetings →</Link>
            <Link href="/blog/ai-powered-scheduling-setup" className="text-sm text-[#0066FF] hover:underline">AI-Powered Scheduling Setup →</Link>
            <Link href="/use-cases/ai-agents" className="text-sm text-[#0066FF] hover:underline">AI Agents Use Case →</Link>
            <Link href="/alternatives/calendly" className="text-sm text-[#0066FF] hover:underline">Calendly Alternative →</Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="letsmeet.link" width={24} height={24} />
              <span className="text-sm text-gray-500">
                © {new Date().getFullYear()} letsmeet.link. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/mcp" className="text-sm text-gray-500 hover:text-gray-700">
                MCP Guide
              </Link>
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
