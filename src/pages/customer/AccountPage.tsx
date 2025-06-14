
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
  name: string | null;
  email: string;
  phone: string | null;
  avatar_url?: string | null;
  created_at: string;
}

const AccountPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch profile and auto-create if not exists
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        toast.error('Error fetching profile');
        setLoading(false);
        return;
      }
      if (data) {
        setProfile(data);
        setName(data.name ?? '');
        setPhone(data.phone ?? '');
        setLoading(false);
      } else {
        // If no profile, attempt to create one based on user metadata
        const insertProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
          email: user.email || '',
          phone: user.user_metadata?.phone || '',
          role: 'customer',
        };
        console.log('Profile missing, inserting', insertProfile);
        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .insert([insertProfile])
          .select('*')
          .maybeSingle();
        if (createErr || !created) {
          toast.error('Failed to create profile');
          setLoading(false);
          return;
        }
        setProfile(created);
        setName(created.name || '');
        setPhone(created.phone || '');
        setLoading(false);
      }
    } catch (err) {
      console.error('Profile fetch error', err);
      toast.error('A profile error occurred');
      setLoading(false);
    }
  }, [user?.id, user?.email, user?.user_metadata]);

  useEffect(() => {
    if (user?.id) fetchProfile();
  }, [user?.id, fetchProfile]);

  // Save profile edits
  const handleSave = async () => {
    if (!profile?.id) {
      toast.error('Cannot update: profile not loaded');
      return;
    }
    setSaving(true);
    try {
      const updates: Partial<Profile> = {
        name: name.trim(),
        phone: phone.trim(),
      };
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) {
        toast.error('Failed to update profile');
      } else {
        toast.success('Profile updated');
        // Re-fetch to update UI
        fetchProfile();
      }
    } catch (err) {
      toast.error('Unexpected profile update error');
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-thin">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile?.avatar_url ?? ''} />
                <AvatarFallback className="bg-booqit-primary/10 text-booqit-primary text-lg">
                  {getInitials(name || profile?.name || user?.email?.split('@')[0] || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{name || profile?.name || 'No name set'}</h3>
                <p className="text-sm text-gray-600">{profile?.email || user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <span className="text-sm font-medium">Customer</span>
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
