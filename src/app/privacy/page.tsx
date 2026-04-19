import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - ListingFlare",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="font-serif text-xl font-bold text-gray-900">
          Listing<span className="text-brand-400">Flare</span>
        </Link>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-4xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-gray-500">Last updated: March 17, 2026</p>

        <div className="mt-10 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">1. Information We Collect</h2>
            <p className="mt-3">We collect information you provide directly to us, including:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, phone number, and professional details (brokerage, title).</li>
              <li><strong>Listing Data:</strong> Property details, photos, and videos you upload to create listing pages.</li>
              <li><strong>Lead Information:</strong> When a visitor submits a contact form on a listing page, we collect their name, email, phone number, and message.</li>
              <li><strong>Payment Information:</strong> Billing details are processed securely by Stripe. We do not store your credit card information on our servers.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>To provide and maintain the ListingFlare service</li>
              <li>To create and host property listing websites on your behalf</li>
              <li>To process transactions and send related billing information</li>
              <li>To forward leads and contact form submissions to the appropriate agent</li>
              <li>To send you service-related notifications and updates</li>
              <li>To respond to your requests and provide customer support</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">3. Information Sharing</h2>
            <p className="mt-3">We do not sell your personal information. We share information only in the following circumstances:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li><strong>With your consent:</strong> When you publish a listing, your agent profile information (name, brokerage, phone, email, social links) is displayed publicly on the listing page.</li>
              <li><strong>Lead data:</strong> Contact form submissions are shared only with the agent who owns the listing.</li>
              <li><strong>Service providers:</strong> We use trusted third-party services (Supabase, Stripe, Vercel) to operate our platform.</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">4. Data Security</h2>
            <p className="mt-3">We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS), secure authentication, and row-level security policies on our database. However, no method of transmission over the Internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">5. Data Retention</h2>
            <p className="mt-3">We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or business purposes.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">6. Your Rights</h2>
            <p className="mt-3">You have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Access and export your personal data</li>
              <li>Update or correct your information via the Settings page</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">7. Cookies</h2>
            <p className="mt-3">We use essential cookies for authentication and session management. We do not use third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">8. Your Privacy Rights (CCPA and GDPR)</h2>
            <p className="mt-3">If you are a California resident, the California Consumer Privacy Act (CCPA) gives you specific rights regarding your personal information, including the right to know what data we collect, the right to request deletion, and the right to opt out of the sale of your personal information. We do not sell your personal information to third parties.</p>
            <p className="mt-3">If you are located in the European Economic Area (EEA), the General Data Protection Regulation (GDPR) gives you additional rights including the right to access, rectify, port, and erase your data, as well as the right to restrict or object to processing. Our legal basis for processing your information is your consent (which you can withdraw at any time) and our legitimate interest in providing the ListingFlare service.</p>
            <p className="mt-3">To exercise any of these rights, please contact us at <a href="mailto:kelvin@listingflare.com" className="text-brand-600 hover:underline">kelvin@listingflare.com</a>. We will respond to your request within 30 days.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">9. Lead Data Retention</h2>
            <p className="mt-3">Lead information captured through listing pages (buyer names, emails, phone numbers, and messages) is stored securely in our database and shared only with the listing agent who owns that property page. Agents can delete individual leads or their entire account at any time. When an agent deletes their account, all associated lead data is permanently deleted within 30 days.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">10. Changes to This Policy</h2>
            <p className="mt-3">We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-gray-900">11. Contact Us</h2>
            <p className="mt-3">If you have questions about this privacy policy or your data, please contact us at <a href="mailto:support@listingflare.com" className="text-brand-600 hover:underline">support@listingflare.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
