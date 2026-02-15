import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meeting Cost Calculator — How Much Do Your Meetings Cost?",
  description: "Calculate how much meetings actually cost your team per year. Input attendees, salary, duration and frequency to see the true cost — and how to reduce it.",
  keywords: ["meeting cost calculator", "meeting cost", "meeting productivity", "meeting waste", "scheduling tool"],
  openGraph: {
    title: "Meeting Cost Calculator — How Much Do Your Meetings Cost?",
    description: "Your meetings might cost more than you think. Calculate the true cost and see how to save.",
    url: "https://www.letsmeet.link/tools/meeting-cost-calculator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "💸 Meeting Cost Calculator",
    description: "Your meetings might cost more than you think. Calculate the true cost.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
