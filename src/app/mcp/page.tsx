import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "MCP Guide — Connect AI Agents to letsmeet.link",
  description:
    "Learn how to connect any AI agent to letsmeet.link via the Model Context Protocol (MCP). Works with Claude, ChatGPT, OpenClaw, and more.",
};

export default function McpGuidePage() {
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

          {/* Two Methods */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">Two Ways to Connect</h2>

            {/* Method 1: HTTP */}
            <div className="mb-10">
              <h3 className="text-xl font-semibold text-gray-900 !mt-0 mb-3 flex items-center gap-2">
                🌐 HTTP API (Cloud AI agents)
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Best for cloud-hosted AI agents and services. Works with any AI that supports MCP over HTTP.
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">1. Get your API key from <Link href="/dashboard/settings" className="text-[#0066FF] hover:underline">Settings</Link></p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">2. Configure your MCP client:</p>
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "letsmeet": {
      "type": "http",
      "url": "https://www.letsmeet.link/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Method 2: Stdio */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 !mt-0 mb-3 flex items-center gap-2">
                💻 Stdio Server (Local AI clients)
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Best for Claude Desktop, OpenClaw, and other local MCP clients that run on your machine.
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Configure in your MCP client settings:</p>
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
{`{
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
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Available Tools */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 !mt-0">Available Tools</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Once connected, your AI agent can use these tools:
            </p>

            <h3 className="text-lg font-semibold text-gray-900 !mt-0 mb-4">HTTP API Tools</h3>
            <div className="space-y-3 mb-8">
              {[
                { name: "get_event_types", desc: "List your meeting types (30-min call, coffee chat, etc.)" },
                { name: "get_bookings", desc: "See upcoming meetings and their details" },
                { name: "cancel_booking", desc: "Cancel a scheduled meeting" },
                { name: "get_my_booking_link", desc: "Get your shareable booking URL" },
                { name: "find_user", desc: "Look up another user on the platform" },
                { name: "get_user_event_types", desc: "See another user's available meeting types" },
                { name: "get_available_slots", desc: "Find open time slots for a specific event type" },
                { name: "create_booking", desc: "Book a meeting at an available time" },
              ].map((tool) => (
                <div key={tool.name} className="flex gap-3 items-start">
                  <code className="text-xs bg-gray-100 text-[#0066FF] px-2 py-1 rounded font-mono flex-shrink-0 mt-0.5">{tool.name}</code>
                  <span className="text-sm text-gray-600">{tool.desc}</span>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 !mt-0 mb-4">Stdio Server Tools</h3>
            <div className="space-y-3">
              {[
                { name: "create_booking", desc: "Book a meeting at an available time" },
                { name: "list_availability", desc: "See your weekly availability schedule" },
                { name: "set_availability", desc: "Update your available hours for a day" },
                { name: "add_date_override", desc: "Block a date or set custom hours" },
                { name: "get_event_types", desc: "List your meeting types" },
                { name: "get_bookings", desc: "See upcoming meetings" },
                { name: "cancel_booking", desc: "Cancel a scheduled meeting" },
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
                <span className="text-sm text-gray-800">I found Sarah on letsmeet.link. She has a &quot;Quick Call&quot; event type (30 min). Let me check her availability... She&apos;s free Tuesday at 2pm, Wednesday at 10am, and Thursday at 3pm. Which works for you?</span>
              </div>
              <div className="flex gap-3">
                <span className="text-sm font-medium text-gray-500 w-12 flex-shrink-0">You:</span>
                <span className="text-sm text-gray-800">&quot;Tuesday 2pm&quot;</span>
              </div>
              <div className="flex gap-3">
                <span className="text-sm font-medium text-[#0066FF] w-12 flex-shrink-0">AI:</span>
                <span className="text-sm text-gray-800">Done! ✅ Booked a 30-min call with Sarah for Tuesday at 2:00 PM. Calendar invite sent to both of you.</span>
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
