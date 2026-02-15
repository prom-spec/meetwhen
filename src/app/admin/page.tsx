"use client";

import { useState, useEffect, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

function BarChart({ data, labelKey, valueKey, color = "#3B82F6" }: { data: any[]; labelKey: string; valueKey: string; color?: string }) {
  if (!data || data.length === 0) return <p className="text-zinc-500 text-sm">No data</p>;
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-1">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-28 truncate text-zinc-400 text-xs">{String(d[labelKey])}</span>
          <div className="flex-1 h-5 bg-zinc-800 rounded overflow-hidden">
            <div style={{ width: `${(Number(d[valueKey]) / max) * 100}%`, backgroundColor: color }} className="h-full rounded transition-all" />
          </div>
          <span className="w-10 text-right text-zinc-300 text-xs">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 ${className}`}>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-zinc-400">{label}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: any[][] }) {
  if (!rows || rows.length === 0) return <p className="text-zinc-500 text-sm">No data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((c, i) => (
              <th key={i} className="text-left py-2 px-2 text-zinc-400 font-medium text-xs">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              {row.map((cell, j) => (
                <td key={j} className="py-1.5 px-2 text-zinc-300 text-xs">{String(cell ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/stats?secret=${encodeURIComponent(secret)}`);
      if (!res.ok) throw new Error(res.status === 401 ? "Invalid secret" : `Error ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    if (!autoRefresh || !secret) return;
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, secret, fetchStats]);

  // Try to load secret from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("secret");
    if (s) {
      setSecret(s);
    }
  }, []);

  // Auto-fetch when secret is set from URL
  useEffect(() => {
    if (secret && !data && !loading) fetchStats();
  }, [secret, data, loading, fetchStats]);

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold text-white mb-4">Admin Dashboard</h1>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchStats()}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white mb-3 focus:outline-none focus:border-blue-500"
          />
          <button onClick={fetchStats} disabled={loading} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? "Loading..." : "Enter"}
          </button>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  const d = data;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold">LetsMeet Admin</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${autoRefresh ? "bg-green-600" : "bg-zinc-800 text-zinc-400"}`}
            >
              {autoRefresh ? "⟳ Auto" : "Auto-refresh"}
            </button>
            <button onClick={fetchStats} disabled={loading} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
              {loading ? "..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card title="Users">
            <Stat label="Total" value={d.overview.totalUsers} sub={`+${d.overview.usersThisWeek} this week · +${d.overview.usersThisMonth} this month`} />
          </Card>
          <Card title="Bookings">
            <Stat label="Total" value={d.overview.totalBookings} sub={`+${d.overview.bookingsThisWeek} this week · +${d.overview.bookingsThisMonth} this month`} />
          </Card>
          <Card title="Event Types">
            <Stat label="Total" value={d.overview.totalEventTypes} sub={`${d.overview.activeEventTypes} active · ${d.overview.inactiveEventTypes} inactive`} />
          </Card>
          <Card title="Conversion">
            <Stat label="Views → Bookings" value={`${d.overview.conversionRate}%`} sub={`${d.overview.totalPageViews} views · ${d.overview.bookingConfirmedViews} bookings`} />
          </Card>
        </div>

        {/* User Stats */}
        <h2 className="text-lg font-semibold mb-4 text-zinc-300">User Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card title="Users by Plan">
            <BarChart data={d.users.byPlan} labelKey="plan" valueKey="count" />
          </Card>
          <Card title="Connections & Features">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Google Calendar</span><span className="text-white font-medium">{d.users.withGoogle}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Custom Domain</span><span className="text-white font-medium">{d.users.withCustomDomain}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Branding</span><span className="text-white font-medium">{d.users.withBranding}</span></div>
            </div>
          </Card>
          <Card title="Top 10 by Bookings">
            <Table columns={["User", "Email", "Bookings"]} rows={d.users.top10ByBookings.map((u: any) => [u.name || "—", u.email, u.bookingCount])} />
          </Card>
        </div>
        <div className="mb-8">
          <Card title="Recent Signups">
            <Table columns={["Name", "Email", "Plan", "Date"]} rows={d.users.recentSignups.map((u: any) => [u.name || "—", u.email, u.plan, new Date(u.createdAt).toLocaleDateString()])} />
          </Card>
        </div>

        {/* Booking Stats */}
        <h2 className="text-lg font-semibold mb-4 text-zinc-300">Booking Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card title="By Status">
            <BarChart data={d.bookings.byStatus} labelKey="status" valueKey="count" color="#10B981" />
          </Card>
          <Card title="By Location Type">
            <BarChart data={d.bookings.byLocationType} labelKey="locationType" valueKey="count" color="#8B5CF6" />
          </Card>
          <Card title="Summary">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Avg per User</span><span className="text-white font-medium">{d.bookings.avgPerUser}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Recurring</span><span className="text-white font-medium">{d.bookings.recurring}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">One-off</span><span className="text-white font-medium">{d.bookings.oneOff}</span></div>
            </div>
          </Card>
        </div>
        <div className="mb-8">
          <Card title="Bookings (Last 30 Days)">
            <BarChart data={d.bookings.overTime} labelKey="date" valueKey="count" color="#F59E0B" />
          </Card>
        </div>

        {/* Feature Usage */}
        <h2 className="text-lg font-semibold mb-4 text-zinc-300">Feature Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card title="Event Types by Location">
            <BarChart data={d.features.eventTypesByLocation} labelKey="type" valueKey="count" />
          </Card>
          <Card title="Event Types by Scheduling">
            <BarChart data={d.features.eventTypesByScheduling} labelKey="type" valueKey="count" color="#EC4899" />
          </Card>
          <Card title="Event Types by Visibility">
            <BarChart data={d.features.eventTypesByVisibility} labelKey="type" valueKey="count" color="#14B8A6" />
          </Card>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            ["Custom Questions", d.features.customQuestions],
            ["Screening Questions", d.features.screeningQuestions],
            ["Booking Limits", d.features.bookingLimits],
            ["Redirect URLs", d.features.redirectUrls],
            ["Payment", d.features.payment],
            ["Buffer Times", d.features.bufferTimes],
            ["Recurring", d.features.recurring],
            ["Teams", d.features.teams],
            ["Webhooks (active)", d.features.webhooksActive],
            ["Routing Forms", d.features.routingForms],
            ["Email Sequences", d.features.emailSequences],
            ["Meeting Polls", d.features.meetingPolls],
            ["API Keys", d.features.apiKeys],
            ["One-Off Links", d.features.oneOffLinks],
            ["Contacts", d.features.contacts],
            ["Availability Shares", d.features.availabilityShares],
          ].map(([label, value]) => (
            <Card key={label as string} title={label as string}>
              <p className="text-2xl font-bold">{String(value)}</p>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card title="Webhook Deliveries">
            <BarChart data={d.features.webhookDeliveries} labelKey="status" valueKey="count" color="#F59E0B" />
          </Card>
          <Card title="Workflow Executions">
            <BarChart data={d.features.workflowExecutions} labelKey="status" valueKey="count" color="#10B981" />
          </Card>
          <Card title="Workflows by Trigger">
            <BarChart data={d.features.workflowsByTrigger} labelKey="trigger" valueKey="count" color="#8B5CF6" />
          </Card>
          <Card title="Team Members Distribution">
            <BarChart data={d.features.teamMembersStats} labelKey="teamId" valueKey="members" color="#EC4899" />
          </Card>
        </div>

        {/* Funnel Analytics */}
        <h2 className="text-lg font-semibold mb-4 text-zinc-300">Funnel Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card title="Conversion Funnel">
            <div className="space-y-3">
              {[
                { label: "Views", value: d.funnel.view, width: 100 },
                { label: "Slot Selected", value: d.funnel.slot_selected, width: d.funnel.view ? (d.funnel.slot_selected / d.funnel.view) * 100 : 0 },
                { label: "Booking Confirmed", value: d.funnel.booking_confirmed, width: d.funnel.view ? (d.funnel.booking_confirmed / d.funnel.view) * 100 : 0 },
              ].map((step) => (
                <div key={step.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">{step.label}</span>
                    <span className="text-white">{step.value}</span>
                  </div>
                  <div className="h-6 bg-zinc-800 rounded overflow-hidden">
                    <div className="h-full bg-blue-500 rounded transition-all" style={{ width: `${Math.max(step.width, 2)}%` }} />
                  </div>
                </div>
              ))}
              <div className="text-xs text-zinc-500 space-y-1 mt-2">
                <p>View → Slot: {d.funnel.viewToSlot}%</p>
                <p>Slot → Booking: {d.funnel.slotToBooking}%</p>
                <p>View → Booking: {d.funnel.viewToBooking}%</p>
              </div>
            </div>
          </Card>
          <Card title="Top Event Types by Views">
            <Table columns={["Title", "Slug", "Views"]} rows={(d.funnel.topEventTypesByViews || []).map((e: any) => [e.title, e.slug, e.views])} />
          </Card>
        </div>

        {/* Errors */}
        <h2 className="text-lg font-semibold mb-4 text-zinc-300">Errors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card title="Errors by Source">
            <BarChart data={d.errors.bySource} labelKey="source" valueKey="count" color="#EF4444" />
          </Card>
          <Card title="Error Rate (Last 7 Days)">
            <BarChart data={d.errors.rateOverTime} labelKey="date" valueKey="count" color="#EF4444" />
          </Card>
        </div>
        <div className="mb-8">
          <Card title="Recent Errors (Last 50)">
            <Table
              columns={["Time", "Source", "Status", "Path", "Message"]}
              rows={(d.errors.recent || []).map((e: any) => [
                new Date(e.createdAt).toLocaleString(),
                e.source,
                e.statusCode || "—",
                e.requestPath || "—",
                (e.message || "").substring(0, 80),
              ])}
            />
          </Card>
        </div>

        {/* Audit Log */}
        <h2 className="text-lg font-semibold mb-4 text-zinc-300">Audit Log</h2>
        <div className="mb-8">
          <Card title="Recent Audit Entries (Last 50)">
            <Table
              columns={["Time", "User", "Action", "Entity", "Entity ID"]}
              rows={(d.audit.recent || []).map((a: any) => [
                new Date(a.createdAt).toLocaleString(),
                a.user?.email || a.userId,
                a.action,
                a.entityType,
                a.entityId || "—",
              ])}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
