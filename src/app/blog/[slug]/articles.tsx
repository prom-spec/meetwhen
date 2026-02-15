/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";

export function CalendlyFreeArticle() {
  return (
    <>
      <p className="text-lg text-gray-700 leading-relaxed">
        Calendly is the most popular scheduling tool on the market. Over 10 million people use it. But when you sign up for their free plan, you quickly discover it's more of a demo than a product.
      </p>

      <h2>What Calendly's free plan actually gives you</h2>
      <p>
        One event type. That's it. You get a single booking page with one duration, one set of rules, and zero integrations beyond basic calendar sync.
      </p>
      <p>
        Need a 15-minute discovery call AND a 60-minute consultation? That's $10/month. Want to add custom questions to your booking form? $10/month. Want to remove Calendly's branding from your page? That jumps to $16/month.
      </p>

      <h2>The hidden costs add up fast</h2>
      <p>
        Let's do the math. A freelancer who needs 3 event types, custom questions, and no branding pays <strong>$192/year</strong> for Calendly's Teams plan. That's not pocket change when you're running a solo business.
      </p>
      <p>Here's what's locked behind Calendly's paywall:</p>
      <ul>
        <li><strong>Multiple event types</strong> — Can't have both a quick call and a deep-dive session</li>
        <li><strong>Custom booking questions</strong> — Can't qualify leads before they book</li>
        <li><strong>Meeting polls</strong> — Can't find the best time among groups</li>
        <li><strong>Round-robin scheduling</strong> — Can't distribute meetings across a team</li>
        <li><strong>Workflow automations</strong> — Can't send automatic follow-ups</li>
        <li><strong>Remove branding</strong> — Your clients always see "Powered by Calendly"</li>
      </ul>

      <h2>What if free actually meant free?</h2>
      <p>
        That's exactly what we built with <Link href="/" className="text-[#0066FF] hover:underline font-medium">letsmeet.link</Link>. Our free plan includes:
      </p>
      <ul>
        <li><strong>3 event types</strong> — 3x more than Calendly's free plan</li>
        <li><strong>AI chat scheduling</strong> — Your visitors can book through natural conversation</li>
        <li><strong>MCP integration</strong> — Connect any AI agent to manage your calendar</li>
        <li><strong>Custom booking questions</strong> — Qualify leads before they take your time</li>
        <li><strong>Meeting polls</strong> — Find the best time for groups</li>
        <li><strong>Google Calendar sync</strong> — Real-time availability</li>
        <li><strong>Email reminders</strong> — Reduce no-shows automatically</li>
      </ul>

      <h2>And when you need more?</h2>
      <p>
        Our Pro plan is <strong>$1/month</strong>. Not $10. Not $16. One dollar. You get unlimited event types, custom branding, workflows, team scheduling, and everything else.
      </p>
      <p>
        That's $12/year instead of $120-192/year. A savings of up to <strong>$180 per year</strong>.
      </p>

      <h2>The AI advantage</h2>
      <p>
        Here's something Calendly doesn't have at all: AI. Every letsmeet.link booking page has an AI chat assistant built in. Visitors can ask questions, find available times, and book — all through conversation.
      </p>
      <p>
        And if you're building with AI agents (using Claude, ChatGPT, or any MCP-compatible tool), your agent can manage your entire calendar programmatically. No other scheduling platform offers this.
      </p>

      <h2>Ready to switch?</h2>
      <p>
        Moving from Calendly takes about 2 minutes. Sign up, set your availability, create your event types, and share your new link. Your old Calendly bookings still work — just update your link going forward.
      </p>

      <div className="bg-blue-50 rounded-xl p-6 my-8">
        <p className="text-[#0066FF] font-semibold mb-2">Try letsmeet.link free →</p>
        <p className="text-gray-600 text-sm mb-4">3 event types, AI chat, MCP integration. No credit card required.</p>
        <Link href="/login" className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors">
          Start scheduling free
        </Link>
      </div>
    </>
  );
}

export function AiSchedulingArticle() {
  return (
    <>
      <p className="text-lg text-gray-700 leading-relaxed">
        AI agents are getting good at a lot of things — writing emails, analyzing data, managing tasks. But most of them still can't book a meeting. That's about to change.
      </p>

      <h2>The problem: AI agents can't access your calendar</h2>
      <p>
        When you ask ChatGPT to "schedule a meeting with Sarah next Tuesday at 2pm," it can draft a nice email. But it can't actually check your calendar, find an open slot, create the event, and send Sarah a confirmation. There's no connection between the AI and your scheduling tool.
      </p>
      <p>
        Until now, the only solution was complex API integrations that took developers weeks to build.
      </p>

      <h2>Enter MCP: the universal protocol for AI agents</h2>
      <p>
        The Model Context Protocol (MCP) is a standard way for AI agents to interact with external tools. Think of it like USB for AI — a universal connector that lets any compatible agent use any compatible tool.
      </p>
      <p>
        <Link href="/" className="text-[#0066FF] hover:underline font-medium">letsmeet.link</Link> is the first scheduling platform with native MCP support. That means any MCP-compatible AI agent — Claude, ChatGPT via plugins, OpenClaw, or your own custom agent — can:
      </p>
      <ul>
        <li>Check your real-time availability</li>
        <li>Create and manage event types</li>
        <li>Book meetings on your behalf</li>
        <li>Handle rescheduling and cancellations</li>
        <li>Answer scheduling questions for visitors</li>
      </ul>

      <h2>Setup in 2 minutes: step by step</h2>

      <h3>Step 1: Create your letsmeet.link account</h3>
      <p>
        Sign up at <Link href="/login" className="text-[#0066FF] hover:underline">letsmeet.link/login</Link>. Connect your Google Calendar and set your availability. This takes about 60 seconds.
      </p>

      <h3>Step 2: Generate an API key</h3>
      <p>
        Go to Settings → API Keys → Create New Key. Give it a name (e.g., "My AI Agent") and copy the key. You'll need this for the MCP config.
      </p>

      <h3>Step 3: Add to your AI agent's MCP config</h3>
      <p>
        Add this to your agent's MCP configuration file:
      </p>
      <pre className="bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto text-sm my-4">{`{
  "mcpServers": {
    "letsmeet": {
      "command": "npx",
      "args": ["-y", "letsmeet-mcp"],
      "env": {
        "LETSMEET_API_KEY": "your-api-key-here"
      }
    }
  }
}`}</pre>

      <h3>Step 4: Start scheduling</h3>
      <p>
        That's it. Your AI agent can now say things like:
      </p>
      <ul>
        <li>"Book a 30-minute call with sarah@example.com next Tuesday afternoon"</li>
        <li>"What's my availability this week?"</li>
        <li>"Cancel my meeting with John tomorrow"</li>
        <li>"Create a new event type for 15-minute intro calls"</li>
      </ul>

      <h2>No AI agent? No problem.</h2>
      <p>
        Every letsmeet.link booking page also has a built-in AI chat assistant. Your visitors can type natural language like "I need a 30-minute slot next week" and the AI will find available times and handle the booking. No MCP setup needed — it just works.
      </p>

      <h2>Why this matters</h2>
      <p>
        Scheduling is one of those tasks that's simple for humans but surprisingly complex for software. Timezone handling, conflict detection, buffer times, recurring events — there are dozens of edge cases.
      </p>
      <p>
        By building scheduling as an MCP-native tool, we're making it possible for AI agents to handle all of this complexity automatically. Your AI assistant becomes a true personal scheduler.
      </p>

      <div className="bg-blue-50 rounded-xl p-6 my-8">
        <p className="text-[#0066FF] font-semibold mb-2">Connect your AI agent today →</p>
        <p className="text-gray-600 text-sm mb-4">Free plan includes MCP access, 3 event types, and AI chat.</p>
        <Link href="/mcp" className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors">
          Read the MCP guide
        </Link>
      </div>
    </>
  );
}

export function TrueCostArticle() {
  return (
    <>
      <p className="text-lg text-gray-700 leading-relaxed">
        "$10/month doesn't seem like much." That's what most people think when they see Calendly's pricing. But over a year — or across a team — those costs compound. Let's break down what you actually pay.
      </p>

      <h2>Calendly pricing: the real numbers</h2>

      <h3>Solo user (Standard plan)</h3>
      <p>
        Calendly's Standard plan costs <strong>$10/month</strong> (billed annually) or $12/month (billed monthly). This gives you unlimited event types, integrations, and basic automations.
      </p>
      <ul>
        <li>Annual cost: <strong>$120/year</strong></li>
        <li>Monthly billing: <strong>$144/year</strong></li>
      </ul>

      <h3>Team of 5 (Teams plan)</h3>
      <p>
        Calendly Teams costs <strong>$16/month per seat</strong> (annual) or $20/month per seat (monthly). For a 5-person sales team:
      </p>
      <ul>
        <li>Annual cost: <strong>$960/year</strong></li>
        <li>Monthly billing: <strong>$1,200/year</strong></li>
      </ul>

      <h3>Team of 20 (Enterprise)</h3>
      <p>
        At $16/seat/month, a 20-person team pays <strong>$3,840/year</strong>. And that's before enterprise features, which require custom pricing (read: even more expensive).
      </p>

      <h2>letsmeet.link pricing: the comparison</h2>

      <h3>Solo user (Pro plan)</h3>
      <ul>
        <li>Annual cost: <strong>$12/year</strong></li>
        <li>You save: <strong>$108-132/year</strong> vs Calendly</li>
      </ul>

      <h3>Team of 5 (Enterprise plan)</h3>
      <ul>
        <li>Annual cost: <strong>$300/year</strong> ($5/seat/month)</li>
        <li>You save: <strong>$660-900/year</strong> vs Calendly</li>
      </ul>

      <h3>Team of 20</h3>
      <ul>
        <li>Annual cost: <strong>$1,200/year</strong></li>
        <li>You save: <strong>$2,640/year</strong> vs Calendly</li>
      </ul>

      <h2>The feature comparison</h2>
      <p>
        Price only matters if you're getting comparable features. Here's the thing: letsmeet.link's <strong>free plan</strong> includes features that Calendly charges for:
      </p>

      <div className="overflow-x-auto my-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 pr-4">Feature</th>
              <th className="text-center py-2 px-4">Calendly Free</th>
              <th className="text-center py-2 px-4">letsmeet.link Free</th>
            </tr>
          </thead>
          <tbody className="text-gray-600">
            <tr className="border-b"><td className="py-2 pr-4">Event types</td><td className="text-center py-2 px-4">1</td><td className="text-center py-2 px-4 font-medium text-[#0066FF]">3</td></tr>
            <tr className="border-b"><td className="py-2 pr-4">AI chat</td><td className="text-center py-2 px-4">❌</td><td className="text-center py-2 px-4 font-medium text-[#0066FF]">✅</td></tr>
            <tr className="border-b"><td className="py-2 pr-4">MCP integration</td><td className="text-center py-2 px-4">❌</td><td className="text-center py-2 px-4 font-medium text-[#0066FF]">✅</td></tr>
            <tr className="border-b"><td className="py-2 pr-4">Custom questions</td><td className="text-center py-2 px-4">❌</td><td className="text-center py-2 px-4 font-medium text-[#0066FF]">✅</td></tr>
            <tr className="border-b"><td className="py-2 pr-4">Meeting polls</td><td className="text-center py-2 px-4">❌</td><td className="text-center py-2 px-4 font-medium text-[#0066FF]">✅</td></tr>
            <tr className="border-b"><td className="py-2 pr-4">Email reminders</td><td className="text-center py-2 px-4">❌</td><td className="text-center py-2 px-4 font-medium text-[#0066FF]">✅</td></tr>
          </tbody>
        </table>
      </div>

      <h2>What about features Calendly has that we don't?</h2>
      <p>Being transparent: Calendly currently has some integrations we're still building:</p>
      <ul>
        <li><strong>Outlook/Microsoft Calendar</strong> — Coming soon</li>
        <li><strong>Zoom auto-create</strong> — Coming soon</li>
        <li><strong>Stripe payments</strong> — Coming soon</li>
        <li><strong>SMS notifications</strong> — Coming soon</li>
      </ul>
      <p>
        If these are critical for you right now, Calendly may still be the better choice. But for the majority of users who schedule with Google Calendar and Google Meet, letsmeet.link has everything you need — plus AI features Calendly doesn't offer at any price.
      </p>

      <h2>The 3-year cost comparison</h2>
      <p>
        For a solo professional over 3 years:
      </p>
      <ul>
        <li><strong>Calendly Standard:</strong> $360</li>
        <li><strong>letsmeet.link Pro:</strong> $36</li>
        <li><strong>Savings:</strong> $324 (90%)</li>
      </ul>
      <p>
        For a 5-person team over 3 years:
      </p>
      <ul>
        <li><strong>Calendly Teams:</strong> $2,880</li>
        <li><strong>letsmeet.link Enterprise:</strong> $900</li>
        <li><strong>Savings:</strong> $1,980 (69%)</li>
      </ul>

      <h2>The bottom line</h2>
      <p>
        Calendly is a great product. They pioneered the scheduling space. But in 2026, you don't need to pay 2015 prices for scheduling software. letsmeet.link gives you more features in the free plan, AI capabilities at every tier, and pricing that's 90% cheaper.
      </p>
      <p>
        The question isn't whether you can afford to switch. It's whether you can afford not to.
      </p>

      <div className="bg-blue-50 rounded-xl p-6 my-8">
        <p className="text-[#0066FF] font-semibold mb-2">Save 90% on scheduling →</p>
        <p className="text-gray-600 text-sm mb-4">Start free, upgrade to Pro for $1/month when you're ready.</p>
        <Link href="/login" className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors">
          Get started free
        </Link>
      </div>
    </>
  );
}
