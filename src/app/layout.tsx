import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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
    default: "MeetWhen - AI-Powered Scheduling",
    template: "%s | MeetWhen",
  },
  description: "Effortlessly schedule meetings with AI-powered availability detection. The smarter way to book time.",
  keywords: ["scheduling", "calendar", "meetings", "AI", "booking", "availability"],
  authors: [{ name: "MeetWhen" }],
  creator: "MeetWhen",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://meetwhen.app",
    siteName: "MeetWhen",
    title: "MeetWhen - AI-Powered Scheduling",
    description: "Effortlessly schedule meetings with AI-powered availability detection. The smarter way to book time.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MeetWhen - AI-Powered Scheduling",
    description: "Effortlessly schedule meetings with AI-powered availability detection.",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
