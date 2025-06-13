
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DeleteAccountPage: React.FC = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendDeletionRequest = () => {
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    // Get the user's email and normalize both for comparison
    const userEmail = user?.email?.toLowerCase().trim() || '';
    const inputEmail = email.toLowerCase().trim();

    console.log('Comparing emails:', { userEmail, inputEmail });

    if (inputEmail !== userEmail) {
      toast.error('Email address does not match your account');
      return;
    }

    setIsProcessing(true);

    const subject = encodeURIComponent('Account Deletion Request - BooqIt');
    const body = encodeURIComponent(`
Dear BooqIt Support Team,

I am requesting the permanent deletion of my BooqIt account and all associated data.

Account Details:
- Email: ${userEmail}
- User ID: ${user?.id || 'N/A'}
- Request Date: ${new Date().toLocaleDateString('en-IN')}

I understand that this action is irreversible and will result in:
- Permanent deletion of my account
- Removal of all booking history
- Loss of access to the BooqIt platform

Please confirm the deletion within 7-10 business days.

Thank you,
${userEmail}
    `);

    const mailtoUrl = `mailto:support@booqit.in?subject=${subject}&body=${body}`;
    
    try {
      window.open(mailtoUrl, '_blank');
      toast.success('Email app opened with deletion request');
    } catch (error) {
      toast.error('Could not open email app. Please email support@booqit.in manually');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link to="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-red-600">Delete Account</h1>
            <p className="text-sm text-gray-600">Permanently delete your account</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Warning Card */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Warning: This Action Cannot Be Undone
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-700">
            <p className="mb-3">
              Deleting your account will permanently remove all your data from our servers. This includes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Your profile information and preferences</li>
              <li>All booking history and upcoming appointments</li>
              <li>Any saved favorite salons or services</li>
              <li>Account settings and notifications</li>
              <li>All associated data and activity logs</li>
            </ul>
          </CardContent>
        </Card>

        {/* Current Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-gray-600">Customer Account</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deletion Process */}
        <Card>
          <CardHeader>
            <CardTitle>Request Account Deletion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              To proceed with account deletion, please confirm your email address below. 
              This will open your email app with a pre-written deletion request to our support team.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="email">Confirm Your Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Must match your account email: {user?.email}
              </p>
            </div>

            <Button
              onClick={handleSendDeletionRequest}
              disabled={isProcessing || !email.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessing ? 'Processing...' : 'Send Deletion Request'}
            </Button>
          </CardContent>
        </Card>

        {/* Alternative Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              If you're having issues with your account or considering deletion due to a problem, 
              our support team might be able to help resolve it.
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('mailto:support@booqit.in?subject=Account Support', '_blank')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support First
              </Button>
              <Link to="/settings/contact">
                <Button variant="outline" className="w-full">
                  View Contact Information
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Process Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Deletion Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Submit Request</h4>
                  <p className="text-gray-600">Send deletion request via email</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-orange-600">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Review Period</h4>
                  <p className="text-gray-600">3-5 business days for verification</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-red-600">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Account Deletion</h4>
                  <p className="text-gray-600">Complete removal within 7-10 business days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeleteAccountPage;
