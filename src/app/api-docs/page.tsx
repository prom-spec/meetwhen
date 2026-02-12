export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">letsmeet.link API Documentation</h1>
        <p className="text-gray-500 mb-8">REST API v1 — Manage event types, bookings, and more programmatically.</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Authentication</h2>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-600 mb-2">All API requests require a Bearer token. Generate API keys in <strong>Dashboard → Settings → API Keys</strong>.</p>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto">{`curl -H "Authorization: Bearer mk_your_api_key" \\
  https://letsmeet.link/api/v1/me`}</pre>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Rate Limits</h2>
          <p className="text-sm text-gray-600">100 requests per minute per API key. Exceeding returns <code className="bg-gray-100 px-1 rounded">429</code>.</p>
        </section>

        {[
          {
            title: "GET /api/v1/me",
            desc: "Get authenticated user info",
            example: `{ "user": { "id": "...", "email": "...", "name": "...", "timezone": "UTC" } }`,
          },
          {
            title: "GET /api/v1/event-types",
            desc: "List your active event types",
            example: `{ "eventTypes": [{ "id": "...", "title": "30min Call", "duration": 30, ... }] }`,
          },
          {
            title: "GET /api/v1/event-types/:id/availability?date=YYYY-MM-DD",
            desc: "Get available time slots for a specific date",
            example: `{ "date": "2026-02-15", "slots": [{ "start": "...", "end": "..." }] }`,
          },
          {
            title: "POST /api/v1/bookings",
            desc: "Create a new booking",
            body: `{ "eventTypeId": "...", "guestName": "Jane", "guestEmail": "jane@example.com", "startTime": "2026-02-15T10:00:00Z" }`,
            example: `{ "booking": { "id": "...", "status": "CONFIRMED", ... } }`,
          },
          {
            title: "GET /api/v1/bookings",
            desc: "List bookings. Query params: status, limit, offset",
            example: `{ "bookings": [...], "limit": 50, "offset": 0 }`,
          },
          {
            title: "GET /api/v1/bookings/:id",
            desc: "Get booking details",
            example: `{ "booking": { "id": "...", ... } }`,
          },
          {
            title: "DELETE /api/v1/bookings/:id",
            desc: "Cancel a booking",
            example: `{ "booking": { "id": "...", "status": "CANCELLED" } }`,
          },
        ].map((ep, i) => (
          <div key={i} className="mb-6 bg-white rounded-xl border p-4">
            <h3 className="font-mono text-sm font-bold text-blue-600 mb-1">{ep.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{ep.desc}</p>
            {(ep as any).body && (
              <div className="mb-2">
                <span className="text-xs font-medium text-gray-400">Request Body</span>
                <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto">{(ep as any).body}</pre>
              </div>
            )}
            <span className="text-xs font-medium text-gray-400">Response</span>
            <pre className="bg-gray-50 rounded p-2 text-xs overflow-x-auto">{ep.example}</pre>
          </div>
        ))}

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Webhooks</h2>
          <p className="text-sm text-gray-600">
            Configure webhooks in Dashboard → Settings → Webhooks. Events: <code className="bg-gray-100 px-1 rounded">booking.created</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">booking.cancelled</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">booking.rescheduled</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">poll.response_added</code>.
            All payloads are signed with HMAC-SHA256 via <code className="bg-gray-100 px-1 rounded">X-LetsMeet-Signature</code> header.
          </p>
        </section>
      </div>
    </div>
  )
}
