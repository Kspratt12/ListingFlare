import Link from "next/link";

export const metadata = {
  title: "Terms of Service — ListingFlare",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="font-serif text-xl font-bold text-gray-900">
          Listing<span className="text-brand-400">Flare</span>
        </Link>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-4xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-gray-500">Last updated: March 17, 2026</p>

        <div className="mt-10 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p className="mt-3">By accessing or using ListingFlare (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">2. Description of Service</h2>
            <p className="mt-3">ListingFlare provides a platform for licensed real estate agents to create single-property listing websites. The Service includes website hosting, lead capture, and agent dashboard functionality.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">3. Account Registration</h2>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be a licensed real estate professional or authorized representative to use the Service for its intended purpose.</li>
              <li>You must be at least 18 years old to use the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">4. Pricing and Payment</h2>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li><strong>Setup Fee:</strong> A one-time $500 setup fee is charged when you subscribe.</li>
              <li><strong>Monthly Subscription:</strong> $150/month, billed monthly after the setup fee.</li>
              <li><strong>Free Trial:</strong> New accounts receive a 14-day free trial. No credit card required during the trial period.</li>
              <li><strong>Cancellation:</strong> You may cancel your subscription at any time. Your listings will remain active until the end of the current billing period.</li>
              <li><strong>Refunds:</strong> The setup fee is non-refundable. Monthly subscription fees are non-refundable for partial months.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">5. User Content</h2>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>You retain ownership of all content (photos, videos, descriptions) you upload to the Service.</li>
              <li>By uploading content, you grant ListingFlare a license to display it on your listing pages.</li>
              <li>You are responsible for ensuring you have the right to use all content you upload, including photos and property descriptions.</li>
              <li>You must not upload content that is illegal, fraudulent, or infringes on third-party rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">6. Prohibited Uses</h2>
            <p className="mt-3">You may not:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload false or misleading property information</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with the proper operation of the Service</li>
              <li>Resell or redistribute the Service without authorization</li>
              <li>Use the Service to send spam or unsolicited communications</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">7. Lead Data</h2>
            <p className="mt-3">Contact form submissions (leads) collected through your listing pages are your data. ListingFlare facilitates the collection and delivery of leads but is not responsible for the accuracy of information submitted by visitors. You are responsible for complying with applicable laws regarding the use of lead data, including CAN-SPAM and TCPA regulations.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">8. Service Availability</h2>
            <p className="mt-3">We strive to maintain high availability but do not guarantee uninterrupted service. We may perform maintenance or updates that temporarily affect availability. We will make reasonable efforts to provide advance notice of planned downtime.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">9. Limitation of Liability</h2>
            <p className="mt-3">ListingFlare is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">10. Termination</h2>
            <p className="mt-3">We reserve the right to suspend or terminate your account if you violate these terms. Upon termination, your listing pages will be taken offline. You may request export of your data within 30 days of termination.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">11. Changes to Terms</h2>
            <p className="mt-3">We may modify these terms at any time. We will notify you of material changes via email or through the Service. Continued use after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">12. Contact</h2>
            <p className="mt-3">For questions about these terms, contact us at <a href="mailto:support@listingflare.com" className="text-brand-600 hover:underline">support@listingflare.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
