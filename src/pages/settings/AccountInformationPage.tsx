
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Mail, Phone, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
}

const AccountInformationPage: React.FC = () => {
  const { user, userId, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  console.log('🔍 AccountInformation - Auth state:', { isAuthenticated, userId, hasUser: !!user });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !userId) {
      console.log('🚫 Not authenticated, redirecting to home');
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, userId, navigate]);

  // Fetch profile data
  const {
    data: profile,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      console.log('📡 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('❌ Profile fetch error:', error);
        throw error;
      }
      
      console.log('✅ Profile fetched:', data);
      return data as ProfileData;
    },
    enabled: !!userId && isAuthenticated,
    retry: 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      console.log('📝 Updating form with profile data:', profile);
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error('User ID not found');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('💾 Saving profile updates:', formData);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim() || null,
          email: formData.email.trim(),
          phone: formData.phone.trim() || null
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Profile update error:', error);
        throw error;
      }

      console.log('✅ Profile updated successfully');
      
      // Invalidate and refetch profile data
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      await refetch();
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || ''
      });
    }
    setIsEditing(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="flex items-center gap-3 p-4">
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Account Information</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading profile...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="flex items-center gap-3 p-4">
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Account Information</h1>
            </div>
          </div>
        </div>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">Failed to load profile information</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Account Information</h1>
              <p className="text-sm text-gray-600">Manage your personal details</p>
            </div>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              {isEditing ? (
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">
                  {profile?.name || 'Not provided'}
                </div>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email address"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">
                  {profile?.email || 'Not provided'}
                </div>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-900">
                  {profile?.phone || 'Not provided'}
                </div>
              )}
            </div>

            {/* Role Field (Read-only) */}
            <div className="space-y-2">
              <Label>Account Type</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-900 capitalize">
                {profile?.role || 'Customer'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountInformationPage;
