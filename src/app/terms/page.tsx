import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "letsmeet.link Terms of Service - Rules and guidelines for using our scheduling platform.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-[#0066FF] hover:underline text-sm mb-8 inline-block">
          ← Back to letsmeet.link
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 10, 2026</p>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using letsmeet.link (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              letsmeet.link is a scheduling platform that allows users to share their availability and let others book meetings with them. The Service integrates with Google Calendar to detect availability and create events.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2">
              <li>You must sign in with a valid Google account to use the Service.</li>
              <li>You are responsible for maintaining the security of your account.</li>
              <li>You must provide accurate information and keep it up to date.</li>
              <li>You may not use the Service for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Acceptable Use</h2>
            <p className="text-gray-600 leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2">
              <li>Use the Service to send spam or unsolicited communications.</li>
              <li>Attempt to gain unauthorized access to the Service or its systems.</li>
              <li>Interfere with or disrupt the Service or its infrastructure.</li>
              <li>Use automated tools to scrape or collect data from the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service, including its design, code, and branding, is owned by letsmeet.link. You retain ownership of any content you provide (such as your availability settings and profile information).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service is provided &quot;as is&quot; without warranties of any kind. letsmeet.link is not liable for missed meetings, scheduling errors, or any damages arising from use of the Service. We do our best to ensure reliability, but cannot guarantee uninterrupted service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              We may suspend or terminate your access to the Service at any time for violations of these terms. You may stop using the Service and request account deletion at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about these Terms, contact us at{" "}
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
