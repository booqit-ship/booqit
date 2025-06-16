
import React, { Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, User, Calendar, Star, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

const fetchProfile = async (userId: string | null): Promise<Profile | null> => {
  if (!userId) {
    throw new Error('No user ID provided');
  }

  try {
    console.log('🔍 Fetching profile for user:', userId);
    
    // First, ensure profile exists by calling the database function
    const { error: ensureError } = await supabase.rpc('ensure_user_profile');
    if (ensureError) {
      console.warn('⚠️ Profile ensure error (may be ok):', ensureError);
    }

    // Now fetch the profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    console.log('✅ Profile fetched successfully:', profileData);
    return profileData;
  } catch (error) {
    console.error('❌ Error in fetchProfile:', error);
    throw error;
  }
};

const fetchRecentBookings = async (userId: string | null) => {
  if (!userId) return [];
  
  try {
    console.log('📅 Fetching recent bookings for user:', userId);
    
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        date,
        time_slot,
        status,
        merchant:merchants!inner(shop_name),
        service:services!inner(name)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('time_slot', { ascending: false })
      .limit(3);

    if (bookingsError) {
      console.error('❌ Bookings fetch error:', bookingsError);
      return [];
    }

    console.log('✅ Recent bookings fetched:', bookingsData?.length || 0);
    return bookingsData ?? [];
  } catch (error) {
    console.error('❌ Error in fetchRecentBookings:', error);
    return [];
  }
};

const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    <div className="relative overflow-visible bg-gradient-to-br from-booqit-primary to-booqit-primary/80 shadow-lg rounded-b-3xl">
      <div className="flex flex-col items-center pt-12 pb-3">
        <div className="relative">
          <div className="w-24 h-24 shadow-lg border-4 border-white bg-white/30 rounded-full animate-pulse" />
        </div>
        <div className="mt-4 mb-2">
          <div className="h-7 w-40 bg-white/30 rounded mb-2 animate-pulse" />
          <div className="h-5 w-32 bg-white/20 rounded animate-pulse" />
        </div>
      </div>
    </div>
    <div className="p-4 space-y-4 pb-24 -mt-6 flex-1">
      <div className="h-[90px] bg-white rounded-lg shadow animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-white rounded-lg shadow animate-pulse" />
        <div className="h-24 bg-white rounded-lg shadow animate-pulse" />
      </div>
      <div className="h-[110px] bg-white rounded-lg shadow animate-pulse" />
    </div>
  </div>
);

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);

  // Fetch profile with enhanced error handling
  const {
    data: profile,
    isLoading: loadingProfile,
    error: errorProfile,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user?.id ?? null),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      console.log(`🔄 Profile query retry ${failureCount}:`, error);
      return failureCount < 2; // Retry up to 2 times
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Fetch recent bookings
  const {
    data: recentBookings = [],
    isLoading: loadingBookings,
    error: errorBookings
  } = useQuery({
    queryKey: ['recentBookings', user?.id],
    queryFn: () => fetchRecentBookings(user?.id ?? null),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  // Auto-retry profile fetch on auth changes
  useEffect(() => {
    if (user?.id && errorProfile && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log('🔄 Auto-retrying profile fetch');
        setRetryCount(prev => prev + 1);
        refetchProfile();
      }, 1000 * (retryCount + 1)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [user?.id, errorProfile, retryCount, refetchProfile]);

  // Reset retry count on successful load
  useEffect(() => {
    if (profile && !errorProfile) {
      setRetryCount(0);
    }
  }, [profile, errorProfile]);

  // Refresh data when returning to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      }
    };

    const handleFocus = () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, queryClient]);

  const profileItems = [
    {
      icon: Calendar,
      title: 'My Bookings',
      description: 'View your appointment history',
      href: '/bookings-history'
    },
    {
      icon: Star,
      title: 'Reviews',
      description: 'Your reviews and ratings',
      href: '/reviews'
    },
    {
      icon: Settings,
      title: 'Settings',
      description: 'Account settings and preferences',
      href: '/settings'
    }
  ];

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Loading state
  if (loadingProfile || loadingBookings) {
    return <ProfileSkeleton />;
  }

  // Error state with retry option
  if (errorProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white p-6 rounded shadow-md max-w-md w-full text-center">
          <p className="text-lg font-semibold text-red-600 mb-4">
            Failed to load profile data
          </p>
          <p className="text-sm text-gray-600 mb-4">
            {errorProfile.message || 'Something went wrong while loading your profile.'}
          </p>
          <div className="flex gap-2 justify-center">
            <button 
              className="bg-booqit-primary rounded px-4 py-2 text-white font-medium"
              onClick={() => {
                setRetryCount(0);
                refetchProfile();
              }}
            >
              Try Again
            </button>
            <button 
              className="bg-gray-500 rounded px-4 py-2 text-white font-medium"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if no user
  if (!user) {
    window.location.href = '/auth';
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="relative overflow-visible bg-gradient-to-br from-booqit-primary to-booqit-primary/80 shadow-lg rounded-b-3xl">
        <div className="flex flex-col items-center pt-12 pb-3">
          <div className="relative">
            <Avatar className="w-24 h-24 shadow-lg border-4 border-white bg-white/30">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-booqit-primary/80 text-white text-xl font-semibold">
                {getInitials(profile?.name || user?.email || 'User')}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="mt-4 mb-2">
            <h1 className="text-3xl font-righteous tracking-wide font-bold text-white drop-shadow-sm text-center">
              {(profile?.name || user?.email?.split('@')[0] || 'Customer').toUpperCase()}
            </h1>
            <p className="text-sm text-white/70 font-medium mt-1 text-center">
              {profile?.email || user?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24 -mt-6">
        {/* Profile Actions */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            {profileItems.map((item, index) => (
              <Link key={item.href} to={item.href}>
                <div className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                  index !== profileItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}>
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
              </Link>
            ))}
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
                {recentBookings.filter((b: RecentBooking) => b.status === 'completed').length}
              </h3>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <Card>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={logout} className="w-full justify-start py-[17px] my-[12px]">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default function ProfilePageWithSuspense() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfilePage />
    </Suspense>
  );
}
