
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to home page if no history
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackClick}
            className="mb-4 font-poppins"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-righteous text-booqit-dark mb-2">Privacy Policy</h1>
          <p className="text-gray-600 font-poppins">Effective Date: June 6, 2025</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="space-y-4 font-poppins text-gray-700 leading-relaxed">
            <div>
              <p><strong>Company:</strong> 16xstudios</p>
              <p><strong>Location:</strong> Hosur, India</p>
              <p><strong>Contact:</strong> support@booqit.in</p>
            </div>

            <p>
              At 16xstudios, your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the BooqIt app and website. By using our services, you agree to the practices described below.
            </p>

            <div>
              <h2 className="text-xl font-righteous text-booqit-dark mb-3">Information We Collect</h2>
              <p className="mb-2">We collect the following categories of information:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Merchant Data:</strong> Business name, contact details, shop address, service listings, working hours, bank account details (for future UPI payout support).</li>
                <li><strong>Customer Data:</strong> Name, phone number, email (if provided), selected service(s), preferred appointment slot, and communication preferences.</li>
                <li><strong>Technical Data:</strong> Device type, browser, IP address, log data, cookies, and app usage statistics.</li>
                <li><strong>Location Data:</strong> For location-based search results and address autofill.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-righteous text-booqit-dark mb-3">Why We Collect This Data</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>To facilitate service bookings and appointments.</li>
                <li>To improve user experience and personalize content.</li>
                <li>To support future features like UPI and online payments.</li>
                <li>To communicate with users and send service confirmations or reminders.</li>
                <li>For customer support and legal compliance.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-righteous text-booqit-dark mb-3">Use of Bank Details</h2>
              <p>
                We collect merchants' bank account details to prepare for future UPI-based payout functionality. At present, we do not process online transactions. All payments are made directly at the service location ("Pay at Shop"). Bank details are securely stored and encrypted in compliance with industry-standard security practices. We do not share these details with any third-party without consent, except as required by law or financial regulations.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-righteous text-booqit-dark mb-3">Data Security</h2>
              <p>
                We use Supabase and modern cloud infrastructure with encryption and access controls to safeguard your data. However, no online platform can be 100% secure, so we recommend users practice caution and protect their own login credentials.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-righteous text-booqit-dark mb-3">Data Retention</h2>
              <p>
                We retain data as long as necessary for business and legal purposes. Users may request deletion of their data by contacting support@booqit.in.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-righteous text-booqit-dark mb-3">Third-Party Services</h2>
              <p>
                We may integrate with external services like Google Maps (for address suggestions) and messaging providers (for booking notifications). These third parties may collect limited user data in accordance with their own privacy policies.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-righteous text-booqit-dark mb-3">Your Rights</h2>
              <p className="mb-2">You may:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Request access to or deletion of your data.</li>
                <li>Withdraw consent to use your data.</li>
                <li>Contact us for data correction or clarification.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-righteous text-booqit-dark mb-3">Changes to This Policy</h2>
              <p>
                We may update this policy as our platform evolves. Updates will be posted here with a new effective date. Continued use of the app implies acceptance of the revised policy.
              </p>
            </div>

            <div className="bg-booqit-primary/10 p-4 rounded-lg">
              <p className="text-center font-medium">
                For any questions, contact us at: <a href="mailto:support@booqit.in" className="text-booqit-primary hover:underline">support@booqit.in</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
