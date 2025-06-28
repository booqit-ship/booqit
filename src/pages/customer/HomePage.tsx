
import React, { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Star, Clock, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNavigation from '@/components/customer/BottomNavigation';
import UpcomingBookings from '@/components/customer/UpcomingBookings';
import { Link } from 'react-router-dom';

interface Profile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
}

const fetchUserProfile = async (userId: string | null): Promise<Profile | null> => {
  if (!userId) return null;
  
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, phone') // Removed avatar_url to fix 406 error
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }
    
    return profileData;
  } catch (error) {
    console.error('Exception fetching profile:', error);
    return null;
  }
};

const HomePageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 pb-20">
    <div className="bg-gradient-to-br from-booqit-primary to-booqit-primary/80 text-white p-6 rounded-b-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 bg-white/30 rounded w-32 mb-2 animate-pulse" />
          <div className="h-8 bg-white/30 rounded w-48 animate-pulse" />
        </div>
        <div className="w-12 h-12 bg-white/30 rounded-full animate-pulse" />
      </div>
    </div>
    <div className="p-4 space-y-4">
      <div className="h-32 bg-white rounded-lg animate-pulse" />
      <div className="h-48 bg-white rounded-lg animate-pulse" />
    </div>
  </div>
);

const HomePage: React.FC = () => {
  const { user, userId, isAuthenticated } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (profileLoading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-booqit-primary to-booqit-primary/80 text-white p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium">Hello,</h1>
            <h2 className="text-2xl font-righteous">
              {profile?.name || user?.email?.split('@')[0] || 'Customer'}
            </h2>
          </div>
          <Link to="/profile">
            <Avatar className="w-12 h-12 border-2 border-white/30">
              <AvatarImage src="" />
              <AvatarFallback className="bg-booqit-primary/80 text-white font-semibold">
                {getInitials(profile?.name || user?.email)}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/search">
            <Button variant="secondary" className="w-full justify-start bg-white/20 border-white/30 text-white hover:bg-white/30">
              <MapPin className="h-4 w-4 mr-2" />
              Find Salons
            </Button>
          </Link>
          <Link to="/bookings-history">
            <Button variant="secondary" className="w-full justify-start bg-white/20 border-white/30 text-white hover:bg-white/30">
              <Clock className="h-4 w-4 mr-2" />
              My Bookings
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Upcoming Bookings */}
        <Suspense fallback={<div className="h-32 bg-white rounded-lg animate-pulse" />}>
          <UpcomingBookings />
        </Suspense>

        {/* Quick Book Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Book Your Next Appointment</h3>
            <div className="space-y-3">
              <Link to="/search">
                <Button className="w-full justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  Search Nearby Salons
                </Button>
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/search?category=hair">
                  <Button variant="outline" className="w-full">
                    Hair Care
                  </Button>
                </Link>
                <Link to="/search?category=beauty">
                  <Button variant="outline" className="w-full">
                    Beauty
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Need Help?</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Phone className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Link to="/bookings-history">
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  View Booking History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default function HomePageWithSuspense() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePage />
    </Suspense>
  );
}
