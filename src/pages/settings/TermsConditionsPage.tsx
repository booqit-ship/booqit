import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
const TermsConditionsPage: React.FC = () => {
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link to="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-thin">Terms & Conditions</h1>
            <p className="text-sm text-gray-600">Our terms of service</p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <div>
              <p><strong>Operated by:</strong> 16xstudios, Hosur, India</p>
              <p><strong>Support Contact:</strong> support@booqit.in</p>
              <p><strong>Effective Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>
            </div>

            <p>
              Welcome to BooqIt, a platform that connects customers with service providers for appointment-based businesses. By using our app or website, you agree to the following terms:
            </p>

            <div>
              <h2 className="text-lg text-gray-900 mb-3 font-thin">Definitions</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>"User" refers to both customers and merchants using BooqIt.</li>
                <li>"Merchant" refers to businesses offering services via the app.</li>
                <li>"Customer" refers to users booking services.</li>
                <li>"BooqIt" refers to our app, web platform, and backend systems.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-gray-900 mb-3 font-thin text-xl">Scope of Service</h2>
              <div className="space-y-3">
                <div>
                  <p className="font-medium mb-2">BooqIt allows customers to:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Discover nearby service providers.</li>
                    <li>View services, prices, and availability.</li>
                    <li>Book appointments and receive reminders.</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">BooqIt allows merchants to:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Manage their shop listings and availability.</li>
                    <li>Accept bookings from customers.</li>
                    <li>View analytics and upcoming appointment data.</li>
                  </ul>
                </div>
                <p>
                  All payments are currently handled offline at the shop. We do not currently support online payments or UPI transfers. However, we may introduce online payment options in the future.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-gray-900 mb-3 text-xl font-thin">User Obligations</h2>
              <p className="mb-2">By using BooqIt:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>You agree to provide accurate, truthful data.</li>
                <li>You must not abuse or misuse the platform (e.g., spam bookings, impersonation).</li>
                <li>You acknowledge that booking a service does not constitute a guaranteed contract unless confirmed by the merchant.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-gray-900 mb-3 text-xl font-thin">Merchant Obligations</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Merchants must provide accurate and updated service details.</li>
                <li>Bank details are required only to enable future UPI-based payout functionality. No current transaction occurs via the platform.</li>
                <li>Merchants are responsible for honoring or managing customer bookings via the BooqIt Business app or dashboard.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-gray-900 mb-3 text-xl font-thin">Limitations</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>BooqIt is not liable for disputes between customers and merchants.</li>
                <li>BooqIt does not mediate pricing, service quality, or shop-specific policies.</li>
                <li>We reserve the right to suspend users or merchants found violating our policies or engaging in fraudulent activity.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-gray-900 mb-3 text-xl font-thin">Intellectual Property</h2>
              <p>
                All content on BooqIt (text, design, logos, code) is owned or licensed by 16xstudios and cannot be used without permission.
              </p>
            </div>

            <div>
              <h2 className="text-gray-900 mb-3 text-xl font-thin">Account Termination</h2>
              <p>
                We reserve the right to suspend or terminate accounts for violation of terms or abuse of platform features, with or without notice.
              </p>
            </div>

            <div>
              <h2 className="text-gray-900 mb-3 text-xl font-thin">Modifications</h2>
              <p>
                We may update these Terms at any time. Changes will be posted on the app or site, and continued use of the service constitutes agreement to the updated terms.
              </p>
            </div>

            <div className="bg-booqit-primary/10 p-4 rounded-lg">
              <div className="text-center">
                <p className="font-medium mb-2">If you have any questions about these policies, please contact us at:</p>
                <p>📧 <a href="mailto:support@booqit.in" className="text-booqit-primary hover:underline">support@booqit.in</a></p>
                <p>🏢 16xstudios, Hosur, India</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default TermsConditionsPage;