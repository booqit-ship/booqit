import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, User, Calendar, Star, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
}
interface RecentBooking {
  id: string;
  date: string;
  time_slot: string;
  status: string;
  merchant: {
    shop_name: string;
  };
  service: {
    name: string;
  };
}
const ProfilePage: React.FC = () => {
  const {
    user,
    logout
  } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const profileItems = [{
    icon: Calendar,
    title: 'My Bookings',
    description: 'View your appointment history',
    href: '/calendar'
  }, {
    icon: Star,
    title: 'Reviews',
    description: 'Your reviews and ratings',
    href: '/reviews'
  }, {
    icon: Settings,
    title: 'Settings',
    description: 'Account settings and preferences',
    href: '/settings'
  }];
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        console.log('Fetching data for user:', user.id);

        // Fetch profile
        const {
          data: profileData,
          error: profileError
        } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
        }

        // If no profile exists, create one
        if (!profileData) {
          console.log('Creating new profile for user');
          const {
            data: newProfile,
            error: createError
          } = await supabase.from('profiles').insert({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
            email: user.email || '',
            phone: user.user_metadata?.phone || null,
            role: 'customer'
          }).select().single();
          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            setProfile(newProfile);
          }
        } else {
          setProfile(profileData);
        }

        // Fetch recent bookings
        const {
          data: bookingsData,
          error: bookingsError
        } = await supabase.from('bookings').select(`
            id,
            date,
            time_slot,
            status,
            merchant:merchants!inner(shop_name),
            service:services!inner(name)
          `).eq('user_id', user.id).order('date', {
          ascending: false
        }).order('time_slot', {
          ascending: false
        }).limit(3);
        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
        } else {
          console.log('Recent bookings:', bookingsData);
          setRecentBookings(bookingsData || []);
        }
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user?.id]);
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-booqit-primary to-booqit-primary/80 text-white">
        <div className="p-6 pt-12">
          <div className="text-center">
            <Avatar className="w-20 h-20 mx-auto mb-4">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-white/20 text-white text-lg">
                {getInitials(profile?.name || user?.email || 'User')}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold">
              {profile?.name || user?.email?.split('@')[0] || 'Customer'}
            </h1>
            <p className="text-booqit-primary/20 mt-1">{profile?.email || user?.email}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24 -mt-6">
        {/* Recent Bookings */}
        {recentBookings.length > 0 && <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-light">Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentBookings.map((booking, index) => <div key={booking.id} className={`p-4 ${index !== recentBookings.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{booking.merchant.shop_name}</h3>
                      <p className="text-sm text-gray-600">{booking.service.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(booking.date)} at {booking.time_slot}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : booking.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>)}
              <Link to="/calendar" className="block p-4 text-center text-booqit-primary hover:bg-gray-50">
                View All Bookings
              </Link>
            </CardContent>
          </Card>}

        {/* Profile Actions */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            {profileItems.map((item, index) => <Link key={item.href} to={item.href}>
                <div className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${index !== profileItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>)}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="text-2xl font-bold text-booqit-primary">{recentBookings.length}</h3>
              <p className="text-sm text-gray-600">Recent Bookings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <h3 className="text-2xl font-bold text-green-600">
                {recentBookings.filter(b => b.status === 'completed').length}
              </h3>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-thin">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default ProfilePage;