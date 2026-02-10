import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: {
    default: "LetsMeet - Simple Scheduling",
    template: "%s | LetsMeet",
  },
  description: "Simple, free scheduling for everyone. Share your availability and let others book time with you — no back-and-forth needed.",
  metadataBase: new URL("https://letsmeet.link"),
  keywords: ["scheduling", "calendar", "meetings", "AI", "booking", "availability"],
  authors: [{ name: "LetsMeet" }],
  creator: "LetsMeet",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://letsmeet.app",
    siteName: "LetsMeet",
    title: "LetsMeet - Simple Scheduling",
    description: "Simple, free scheduling for everyone. Share your availability and let others book time with you.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "LetsMeet - Simple Scheduling",
    description: "Simple, free scheduling for everyone. Share your availability and let others book time with you.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <footer className="py-6 text-center text-sm text-gray-400 space-x-4">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
