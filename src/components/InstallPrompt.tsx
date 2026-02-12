"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl bg-white p-4 shadow-lg border border-gray-200 flex items-center justify-between gap-3">
      <p className="text-sm text-gray-700">
        Install <strong>letsmeet.link</strong> for quick access
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleDismiss}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="text-sm bg-[#0066FF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0052cc]"
        >
          Install
        </button>
      </div>
    </div>
  );
}
