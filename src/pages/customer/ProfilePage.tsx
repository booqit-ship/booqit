
import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Settings, User, Calendar, Star, ChevronRight, LogOut, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProfileImageUpload from '@/components/customer/ProfileImageUpload';
import { useUserProfile } from '@/hooks/useUserProfile';

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

const fetchRecentBookings = async (userId: string | null) => {
  if (!userId) return [];
  
  try {
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
      console.error('❌ Error fetching bookings:', bookingsError);
      return [];
    }
    
    return bookingsData ?? [];
  } catch (error) {
    console.error('❌ Exception fetching bookings:', error);
    return [];
  }
};

const ProfileSkeleton = () => (
  <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
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
    <div className="p-4 space-y-4 flex-1 overflow-hidden -mt-6">
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
  const { user, logout, isAuthenticated, loading, userId } = useAuth();
  const { profile, isLoading: loadingProfile, error: errorProfile, refetch: refetchProfile } = useUserProfile();

  console.log('🏠 ProfilePage - Auth state:', { 
    isAuthenticated, 
    loading, 
    hasUser: !!user,
    userId: userId 
  });

  const {
    data: recentBookings = [],
    isLoading: loadingBookings
  } = useQuery({
    queryKey: ['recentBookings', userId],
    queryFn: () => fetchRecentBookings(userId ?? null),
    enabled: !!userId && isAuthenticated && !loading,
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

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

  const handleImageUpdate = (newImageUrl: string | null) => {
    refetchProfile();
  };

  const handleLogout = async () => {
    console.log('🚪 User clicked logout from profile page');
    try {
      await logout();
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const handleRefreshProfile = async () => {
    console.log('🔄 Manually refreshing profile data...');
    try {
      await refetchProfile();
      toast.success('Profile refreshed successfully');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
      toast.error('Failed to refresh profile');
    }
  };

  // Show loading state
  if (loading || (loadingProfile && !profile)) {
    console.log('⏳ Showing loading state');
    return <ProfileSkeleton />;
  }

  // Show error state with recovery options
  if (errorProfile && !profile) {
    console.log('❌ Showing error state');
    
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center overflow-hidden">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full mx-4 text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto mb-2" />
            <p className="text-lg font-semibold text-red-600 mb-2">
              Profile Loading Issue
            </p>
            <p className="text-sm text-gray-600 mb-4">
              We're having trouble loading your profile. This might be a temporary issue.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleRefreshProfile}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => {
                console.log('🏠 Going to home page');
                window.location.href = '/home';
              }}
              variant="outline"
              className="w-full"
            >
              Go to Home
            </Button>
            <Button 
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Use profile data with fallbacks
  const displayName = profile?.name || user?.email?.split('@')[0] || 'Customer';
  const displayEmail = profile?.email || user?.email || '';

  console.log('✅ Rendering profile page for:', displayName);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header with Profile Image Upload */}
      <div className="relative overflow-visible bg-gradient-to-br from-booqit-primary to-booqit-primary/80 shadow-lg rounded-b-3xl flex-shrink-0">
        <div className="flex flex-col items-center pt-8 pb-3">
          <div className="w-full max-w-sm px-4">
            <ProfileImageUpload
              currentImageUrl={profile?.avatar_url}
              userName={displayName}
              userId={userId || ''}
              onImageUpdate={handleImageUpdate}
            />
          </div>
          <div className="mt-2 mb-2 text-center">
            <h1 className="text-2xl font-righteous tracking-wide font-bold text-white drop-shadow-sm">
              {displayName.toUpperCase()}
            </h1>
            <p className="text-sm text-white/70 font-medium mt-1">
              {displayEmail}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-hidden -mt-6">
        {/* Profile Actions */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            {profileItems.map((item, index) => (
              <Link key={item.href} to={item.href}>
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
        <Card className="flex-shrink-0">
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full justify-start py-[17px] my-[12px]"
            >
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
