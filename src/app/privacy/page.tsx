import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "LetsMeet Privacy Policy - How we collect, use, and protect your data.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-[#0066FF] hover:underline text-sm mb-8 inline-block">
          ← Back to LetsMeet
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 10, 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed">
              When you use LetsMeet, we collect the following information:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2">
              <li><strong>Account information:</strong> Your name, email address, and profile picture (provided via Google Sign-In).</li>
              <li><strong>Calendar data:</strong> We access your Google Calendar events to determine your availability. We read event times and free/busy status only.</li>
              <li><strong>Scheduling preferences:</strong> Your availability settings, date overrides, and booking page configuration.</li>
              <li><strong>Booking data:</strong> Information provided by people who book meetings with you (name, email, and optional notes).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed">
              We use your information solely to provide scheduling services:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2">
              <li>Display your available time slots to people who want to book meetings with you.</li>
              <li>Create calendar events when bookings are confirmed.</li>
              <li>Send booking confirmations and notifications.</li>
              <li>Prevent double-bookings by checking your calendar in real time.</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-2">
              We do <strong>not</strong> sell, rent, or share your personal data with advertisers or data brokers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed">
              LetsMeet integrates with the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2">
              <li><strong>Google Calendar:</strong> To read your availability and create events. Governed by <a href="https://policies.google.com/privacy" className="text-[#0066FF] hover:underline" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.</li>
              <li><strong>Google Sign-In:</strong> For authentication. We receive your basic profile information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Data Storage &amp; Security</h2>
            <p className="text-gray-600 leading-relaxed">
              Your data is stored securely using industry-standard encryption. We retain your data for as long as your account is active. You may request deletion of your account and all associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You have the right to access, correct, or delete your personal data. You can revoke Google Calendar access at any time through your Google Account settings. To delete your LetsMeet account and data, contact us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this Privacy Policy, contact us at{" "}
              <a href="mailto:support@letsmeet.link" className="text-[#0066FF] hover:underline">
                support@letsmeet.link
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
