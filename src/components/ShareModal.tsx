"use client"

import { useState } from "react"
import { X, Copy, Check, MessageCircle, Mail } from "lucide-react"
import { useToast } from "@/components/ToastProvider"

// Simple X/Twitter icon
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

interface ShareModalProps {
  open: boolean
  onClose: () => void
  bookingUrl: string
  eventTitle: string
}

export default function ShareModal({ open, onClose, bookingUrl, eventTitle }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  if (!open) return null

  const fullUrl = bookingUrl.startsWith("http") ? bookingUrl : `https://${bookingUrl}`
  // For display, strip protocol
  const displayUrl = fullUrl.replace(/^https?:\/\//, "")

  const whatsappMessage = `Hey! Book a time with me here: ${displayUrl} 📅`
  const twitterMessage = `No more "when are you free?" — book time with me: ${displayUrl}`
  const emailSubject = "Book a time with me"
  const emailBody = `Hey!\n\nYou can book a time with me here: ${fullUrl}\n\nLooking forward to connecting!`

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    toast("Link copied to clipboard!", "success")
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOptions = [
    {
      label: "WhatsApp",
      icon: <MessageCircle className="w-5 h-5" />,
      href: `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      label: "Twitter / X",
      icon: <XIcon className="w-5 h-5" />,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterMessage)}`,
      color: "bg-black hover:bg-gray-800",
    },
    {
      label: "Email",
      icon: <Mail className="w-5 h-5" />,
      href: `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
      color: "bg-blue-500 hover:bg-blue-600",
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Share Your Booking Link</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600">
            Your event type <strong>{eventTitle}</strong> is ready! Share it so people can book time with you.
          </p>

          {/* Copy Link */}
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 truncate">
              {displayUrl}
            </div>
            <button
              onClick={copyLink}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                copied
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Share Buttons */}
          <div className="space-y-2">
            {shareOptions.map((opt) => (
              <a
                key={opt.label}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-white text-sm font-medium transition-colors ${opt.color}`}
              >
                {opt.icon}
                Share via {opt.label}
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
