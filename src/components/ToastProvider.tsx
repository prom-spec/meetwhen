"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import Toast, { ToastType } from "./Toast"

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => dismiss(id), 3000)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4">
          {toasts.map((t) => (
            <Toast key={t.id} id={t.id} message={t.message} type={t.type} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
