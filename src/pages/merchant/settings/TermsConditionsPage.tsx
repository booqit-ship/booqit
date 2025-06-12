
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MerchantTermsConditionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link to="/merchant/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Terms & Conditions</h1>
            <p className="text-sm text-gray-600">Our terms of service</p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <div>
              <p><strong>Company:</strong> 16xstudios</p>
              <p><strong>Location:</strong> Hosur, India</p>
              <p><strong>Contact:</strong> support@booqit.in</p>
              <p><strong>Effective Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>
            </div>

            <p>
              Welcome to BooqIt! These Terms & Conditions ("Terms") govern your use of the BooqIt application and services provided by 16xstudios. By using our platform, you agree to these terms.
            </p>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using BooqIt, you agree to be bound by these Terms and our Privacy Policy. If you disagree with any part of these terms, then you may not access the service.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p>
                BooqIt is a platform that connects customers with beauty and salon services. We provide tools for appointment booking, service management, and business operations for salons and beauty professionals.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>You must provide accurate and complete information when creating an account.</li>
                <li>You are responsible for maintaining the security of your account credentials.</li>
                <li>You must notify us immediately of any unauthorized use of your account.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Merchant Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide accurate business information and service details.</li>
                <li>Maintain professional standards and deliver quality services.</li>
                <li>Honor confirmed bookings and maintain scheduled availability.</li>
                <li>Comply with local business regulations and licensing requirements.</li>
                <li>Keep your service listings and pricing information up to date.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Customer Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide accurate contact information for bookings.</li>
                <li>Arrive on time for scheduled appointments.</li>
                <li>Cancel appointments with reasonable notice when necessary.</li>
                <li>Treat service providers with respect and professionalism.</li>
                <li>Pay for services as agreed upon with the merchant.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Payments and Refunds</h2>
              <p>
                Currently, all payments are made directly at the service location ("Pay at Shop"). BooqIt does not process payments directly but may introduce online payment features in the future. Refund policies are determined by individual merchants.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Cancellation Policy</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Customers can cancel bookings through the app.</li>
                <li>Merchants may set their own cancellation policies.</li>
                <li>We recommend providing reasonable notice for cancellations.</li>
                <li>Repeated no-shows may result in booking restrictions.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Prohibited Uses</h2>
              <p className="mb-2">You may not use BooqIt to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Violate any applicable laws or regulations.</li>
                <li>Post false, misleading, or fraudulent information.</li>
                <li>Harass, abuse, or harm other users.</li>
                <li>Attempt to gain unauthorized access to our systems.</li>
                <li>Use the platform for any illegal or unauthorized purposes.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
              <p>
                BooqIt serves as a platform connecting customers and service providers. We are not responsible for the quality of services provided by merchants or any disputes between users. Our liability is limited to the maximum extent permitted by law.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Users will be notified of significant changes. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contact Information</h2>
              <p>
                For questions about these Terms, please contact us at support@booqit.in or call +91-9884339363.
              </p>
            </div>

            <div className="bg-booqit-primary/10 p-4 rounded-lg">
              <p className="text-center font-medium">
                By using BooqIt, you acknowledge that you have read and understood these Terms & Conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantTermsConditionsPage;
