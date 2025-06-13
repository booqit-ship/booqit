import React, { useState, useEffect } from 'react';
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
  avatar_url: string | null;
  created_at: string;
}
const AccountPage: React.FC = () => {
  const {
    user
  } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fetchProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      console.log('Fetching profile for user:', user.id);
      let {
        data: profileData,
        error
      } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Profile not found, creating new one');
        const {
          data: newProfile,
          error: createError
        } = await supabase.from('profiles').insert({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          phone: user.user_metadata?.phone || '',
          role: 'customer'
        }).select().single();
        if (createError) {
          console.error('Error creating profile:', createError);
          toast.error('Failed to create profile');
          return;
        }
        profileData = newProfile;
      } else if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
        return;
      }
      if (profileData) {
        console.log('Profile loaded:', profileData);
        setProfile(profileData);
        setName(profileData.name || '');
        setPhone(profileData.phone || '');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProfile();
  }, [user?.id]);
  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      console.log('Updating profile with:', {
        name: name.trim(),
        phone: phone.trim()
      });
      const {
        error
      } = await supabase.from('profiles').update({
        name: name.trim() || null,
        phone: phone.trim() || null,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      toast.success('Profile updated successfully');
      await fetchProfile(); // Refresh the data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
      </div>;
  }
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
            <h1 className="font-thin text-xl">Account Information</h1>
            <p className="text-sm text-gray-600">Manage your personal details</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Profile Picture Section */}
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
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-booqit-primary/10 text-booqit-primary text-lg">
                  {getInitials(name || profile?.name || 'User')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{name || profile?.name || 'No name set'}</h3>
                <p className="text-sm text-gray-600">{profile?.email || user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="font-normal">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={profile?.email || user?.email || ''} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter your phone number" type="tel" />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Account Information */}
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
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN') : 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">User ID</span>
              </div>
              <span className="text-sm font-medium text-gray-400">
                {user?.id?.slice(0, 8)}...
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700">
              <strong>Security Tip:</strong> Keep your account information up to date to ensure you receive important notifications about your bookings and account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default AccountPage;