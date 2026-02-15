"use client"

import { useState, useEffect, use } from "react"
import { Loader2, ArrowRight } from "lucide-react"
import Image from "next/image"

interface Field {
  id: string
  label: string
  type: string
  required: boolean
  options: string | null
  order: number
}

interface FormData {
  id: string
  title: string
  description: string | null
  fields: Field[]
  user: { name: string | null; username: string | null; image: string | null }
}

export default function PublicRoutingFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [form, setForm] = useState<FormData | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/routing-forms/${id}/public`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => { setForm(data); setLoading(false) })
      .catch(() => { setError("Form not found"); setLoading(false) })
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/routing-forms/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Unable to submit form. Please try again."); setSubmitting(false); return }
      window.location.href = data.redirectUrl
    } catch {
      setError("Unable to submit form. Please check your connection and try again.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-500">This routing form doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    )
  }

  function parseOptions(options: string | null): string[] {
    if (!options) return []
    try { return JSON.parse(options) } catch { return [] }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Host info */}
          <div className="flex items-center gap-3 mb-6">
            {form.user.image && (
              <Image src={form.user.image} alt="" width={40} height={40} className="rounded-full" />
            )}
            <span className="text-sm text-gray-500">{form.user.name || form.user.username}</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">{form.title}</h1>
          {form.description && <p className="text-gray-500 mb-6">{form.description}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {form.fields.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "select" ? (
                  <select
                    value={answers[field.id] || ""}
                    onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                    required={field.required}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none bg-white"
                  >
                    <option value="">Select an option...</option>
                    {parseOptions(field.options).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={answers[field.id] || ""}
                    onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                    required={field.required}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none resize-none"
                  />
                ) : (
                  <input
                    type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                    value={answers[field.id] || ""}
                    onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                    required={field.required}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none"
                  />
                )}
              </div>
            ))}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0066FF] text-white rounded-lg hover:bg-[#0055DD] transition-colors disabled:opacity-50 font-medium"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Continue
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <a href="https://letsmeet.link" className="hover:underline">letsmeet.link</a>
        </p>
      </div>
    </div>
  )
}
