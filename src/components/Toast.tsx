"use client"

import { CheckCircle, XCircle, Info, X } from "lucide-react"

export type ToastType = "success" | "error" | "info"

interface ToastProps {
  id: string
  message: string
  type: ToastType
  onDismiss: (id: string) => void
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
}

const bg = {
  success: "bg-green-50 border-green-200",
  error: "bg-red-50 border-red-200",
  info: "bg-blue-50 border-blue-200",
}

export default function Toast({ id, message, type, onDismiss }: ToastProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bg[type]} animate-slide-up`}
    >
      {icons[type]}
      <p className="text-sm text-gray-800 flex-1">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
