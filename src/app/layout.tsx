import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
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
