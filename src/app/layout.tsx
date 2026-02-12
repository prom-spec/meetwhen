import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import Providers from "@/components/Providers";
import InstallPrompt from "@/components/InstallPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
  themeColor: "#0066FF",
}

export const metadata: Metadata = {
  title: {
    default: "letsmeet.link - AI-First Scheduling",
    template: "%s | letsmeet.link",
  },
  description: "The scheduling platform built for AI agents. AI chat built in, MCP integration ready. Any AI can manage your calendar, book meetings, and handle scheduling.",
  metadataBase: new URL("https://www.letsmeet.link"),
  keywords: ["scheduling", "calendar", "meetings", "AI", "MCP", "AI agent", "booking", "availability"],
  authors: [{ name: "letsmeet.link" }],
  creator: "letsmeet.link",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.letsmeet.link",
    siteName: "letsmeet.link",
    title: "letsmeet.link - AI-First Scheduling",
    description: "The scheduling platform built for AI agents. AI chat, MCP integration, and smart calendar management.",
  },
  twitter: {
    card: "summary_large_image",
    title: "letsmeet.link - AI-First Scheduling",
    description: "The scheduling platform built for AI agents. AI chat, MCP integration, and smart calendar management.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <InstallPrompt />
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
