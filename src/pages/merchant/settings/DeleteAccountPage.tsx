
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const MerchantDeleteAccountPage: React.FC = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsConfirmed(value === user?.email);
  };

  const handleSendDeletionRequest = () => {
    if (!isConfirmed) {
      toast.error('Please enter your email address to confirm');
      return;
    }

    const subject = 'Account Deletion Request - Merchant';
    const body = `Dear BooqIt Support Team,

I am writing to request the permanent deletion of my merchant account from the BooqIt platform.

Account Details:
- Email: ${user?.email}
- Account Type: Merchant
- Request Date: ${new Date().toLocaleDateString('en-IN')}

I understand that this action is irreversible and will result in:
- Permanent deletion of my merchant profile and business information
- Removal of all booking history and customer data
- Loss of access to all app features and services
- Deletion of all uploaded images and documents

I confirm that I want to proceed with the deletion of my account and all associated data.

Please process this request and confirm once the account has been deleted.

Thank you for your assistance.

Best regards,
${user?.email}`;

    const mailtoLink = `mailto:support@booqit.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      window.open(mailtoLink, '_blank');
      toast.success('Email app opened with deletion request');
    } catch (error) {
      console.error('Error opening email app:', error);
      toast.error('Could not open email app. Please email support@booqit.in manually.');
    }
  };

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
            <h1 className="text-xl font-semibold text-red-600">Delete Account</h1>
            <p className="text-sm text-gray-600">Permanently delete your merchant account</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Warning Alert */}
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            <strong>Warning:</strong> This action cannot be undone. Deleting your account will permanently remove all your business data, bookings, and customer information.
          </AlertDescription>
        </Alert>

        {/* Consequences Card */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              What happens when you delete your account?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>Your merchant profile and business information will be permanently deleted</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>All booking history and customer data will be removed</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>Your services, pricing, and availability settings will be lost</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>All uploaded images and documents will be deleted</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>You will lose access to analytics and business insights</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>Future customers will not be able to find or book your services</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Current Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Mail className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-gray-600">Merchant Account</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Confirmation */}
        <Card>
          <CardHeader>
            <CardTitle>Confirm Account Deletion</CardTitle>
            <p className="text-sm text-gray-600">
              To proceed with account deletion, please enter your email address below and click the send button. 
              This will open your email app with a pre-written deletion request.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Enter your email address to confirm:
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder={user?.email || 'Enter your email'}
                className={isConfirmed ? 'border-green-500' : 'border-gray-300'}
              />
              {email && !isConfirmed && (
                <p className="text-sm text-red-600 mt-1">
                  Email doesn't match your account email
                </p>
              )}
              {isConfirmed && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Email confirmed
                </p>
              )}
            </div>

            <Button
              onClick={handleSendDeletionRequest}
              disabled={!isConfirmed}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Deletion Request
            </Button>
          </CardContent>
        </Card>

        {/* Process Information */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Deletion Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-blue-700 text-sm space-y-2">
              <p><strong>1.</strong> Click the "Send Deletion Request" button above</p>
              <p><strong>2.</strong> Your email app will open with a pre-written message</p>
              <p><strong>3.</strong> Send the email to our support team</p>
              <p><strong>4.</strong> We will process your request within 7 business days</p>
              <p><strong>5.</strong> You will receive a confirmation once deletion is complete</p>
            </div>
          </CardContent>
        </Card>

        {/* Support Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 text-sm mb-3">
              If you're having issues with the deletion process or have questions, 
              contact our support team directly:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-booqit-primary">support@booqit.in</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">+91-9884339363</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MerchantDeleteAccountPage;
