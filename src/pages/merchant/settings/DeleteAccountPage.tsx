
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DeleteAccountPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    // Normalize both emails for comparison (trim and lowercase)
    const userEmail = user.email?.trim().toLowerCase();
    const inputEmail = email.trim().toLowerCase();

    if (!inputEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (inputEmail !== userEmail) {
      toast.error('Email address does not match your account');
      return;
    }

    try {
      setIsDeleting(true);

      // Get merchant data first
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (merchant) {
        // Cancel all bookings for this merchant
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('merchant_id', merchant.id)
          .in('status', ['pending', 'confirmed']);

        if (bookingError) {
          console.error('Error cancelling merchant bookings:', bookingError);
        }

        // Delete merchant data (this will cascade to related tables)
        const { error: merchantError } = await supabase
          .from('merchants')
          .delete()
          .eq('user_id', user.id);

        if (merchantError) {
          console.error('Error deleting merchant:', merchantError);
          toast.error('Failed to delete merchant data');
          return;
        }
      }

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        toast.error('Failed to delete account data');
        return;
      }

      // Sign out the user
      await logout();
      
      toast.success('Account deleted successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
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
            <p className="text-sm text-gray-600">Permanently delete your merchant account and data</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Warning Card */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Warning: This action cannot be undone
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-700">
            <p className="mb-3">Deleting your merchant account will:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Permanently delete your business information</li>
              <li>Remove your shop from the platform</li>
              <li>Cancel all pending customer appointments</li>
              <li>Delete all your services and staff data</li>
              <li>Remove all booking history and analytics</li>
              <li>Delete banking and payment information</li>
            </ul>
          </CardContent>
        </Card>

        {/* Current Account */}
        <Card>
          <CardHeader>
            <CardTitle>Current Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-booqit-primary/10 rounded-full flex items-center justify-center">
                <span className="text-booqit-primary font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">Merchant Account</p>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deletion Form */}
        <Card>
          <CardHeader>
            <CardTitle>Request Account Deletion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              To proceed with account deletion, please confirm your email address below. 
              This will permanently delete your merchant account and all associated data.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="email">Confirm Your Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                Must match your account email: {user?.email}
              </p>
            </div>

            <Button
              onClick={handleDeleteAccount}
              disabled={isDeleting || !email}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting Account...' : 'Delete My Merchant Account'}
            </Button>
          </CardContent>
        </Card>

        {/* Support Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700">
              <strong>Need Help?</strong> If you're having issues with your merchant account, 
              consider contacting our support team before deleting your account. 
              We're here to help resolve any problems you might be experiencing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeleteAccountPage;
