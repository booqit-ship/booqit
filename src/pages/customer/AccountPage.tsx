import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url?: string | null;
  created_at: string;
  role: string;
}

const AccountPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setError("Session expired or not logged in. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('[fetchProfile] Fetching profile for user:', user.id);

    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        setError("Unable to load account information. Please log in again.");
        console.error('[fetchProfile] Error fetching profile:', fetchError);
      }

      if (existingProfile) {
        console.log('[fetchProfile] Found existing profile:', existingProfile);
        setProfile(existingProfile);
        setName(existingProfile.name || '');
        setPhone(existingProfile.phone || '');
      } else {
        // Create fallback profile data
        const fallbackProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
          email: user.email || '',
          phone: user.user_metadata?.phone || null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          role: 'customer'
        };

        setProfile(fallbackProfile);
        setName(fallbackProfile.name);
        setPhone(fallbackProfile.phone || '');
        console.log('[fetchProfile] No profile found, using fallback data');
      }
    } catch (err) {
      setError("A network or session error occurred. Please log in again.");
      // Create fallback profile even on error
      const fallbackProfile = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
        email: user.email || '',
        phone: user.user_metadata?.phone || null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        role: 'customer'
      };

      setProfile(fallbackProfile);
      setName(fallbackProfile.name);
      setPhone(fallbackProfile.phone || '');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, user?.user_metadata]);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    } else {
      setError("Session expired or not logged in. Please log in again.");
      setLoading(false);
    }
  }, [fetchProfile, user?.id]);

  // Create or Update profile
  const handleSave = async () => {
    if (!user || !user.id) {
      toast.error('You must be logged in to edit your profile.');
      console.error('[handleSave] Attempted save without user session.');
      return;
    }

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    console.log('[handleSave] Saving profile...');
    console.log('[handleSave] User object:', user);

    try {
      // Always set id === user.id, only allow updating own profile!
      const profileData = {
        id: user.id,
        name: name.trim(),
        email: user.email || '',
        phone: phone.trim() || null,
        role: 'customer',
      };

      console.log('[handleSave] Upsert payload:', profileData);

      // Always supply the authenticated session
      // Defensive: If session is missing, this should fail loudly
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        // Log the error
        console.error('[handleSave] Supabase upsert error:', error, error.details || '');
        if (
          error.message &&
          error.message.includes('violates row-level security policy')
        ) {
          toast.error('Permission denied. Please log out and log in again, and ensure your session is active. (RLS Error)');
        } else {
          toast.error(`Failed to save profile: ${error.message}`);
        }
        setSaving(false);
        return;
      }

      console.log('[handleSave] Profile upserted successfully:', data);
      setProfile(data);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      console.error('[handleSave] Unexpected error:', err);
      toast.error('An unexpected error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  // Helper for initials
  const getInitials = (n: string) => {
    if (!n) return 'U';
    return n
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(x => x[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary" />
      </div>
    );
  }

  // --- NEW: session error UI ---
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white p-6 rounded shadow-md max-w-md w-full text-center">
          <p className="text-lg font-semibold text-red-600 mb-4">{error}</p>
          <button
            className="bg-booqit-primary rounded px-4 py-2 text-white font-medium"
            onClick={() => window.location.href = '/auth'}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

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
            <h1 className="font-thin text-xl">Account Information</h1>
            <p className="text-sm text-gray-600">Manage your personal details</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-thin">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-5 py-4">
              <Avatar className="w-20 h-20 shadow-md flex-shrink-0">
                <AvatarImage src={profile?.avatar_url ?? ''} />
                <AvatarFallback className="bg-booqit-primary/10 text-booqit-primary text-lg">
                  {getInitials(name || profile?.name || user?.email?.split('@')[0] || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col justify-center min-w-0">
                <span className="font-bold text-lg uppercase text-gray-900 truncate">
                  {name || profile?.name || 'No name set'}
                </span>
                <span className="text-base text-gray-500 break-all">
                  {profile?.email || user?.email}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-normal">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={profile?.email || user?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                type="tel"
              />
            </div>
            
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Account Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-normal">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Account Type</span>
              </div>
              <span className="text-sm font-medium capitalize">{profile?.role || 'Customer'}</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Member Since</span>
              </div>
              <span className="text-sm font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-IN')
                  : 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">User ID</span>
              </div>
              <span className="text-sm font-medium text-gray-400">
                {user?.id ? `${user.id.slice(0, 8)}...` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Security Tip Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700">
              <strong>Security Tip:</strong> Keep your account information up to date to ensure you receive important notifications about your bookings and account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountPage;
