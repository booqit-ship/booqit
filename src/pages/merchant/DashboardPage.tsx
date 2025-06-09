
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Booking } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { User, Scissors, BarChart3, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingsToday, setBookingsToday] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [shopImage, setShopImage] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>('');

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Retry utility function with exponential backoff
  const retryWithBackoff = async (fn: () => Promise<any>, retries = 3): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  };

  const fetchMerchantId = async () => {
    if (!userId) {
      console.error('No userId available');
      toast.error('Please log in to continue');
      navigate('/auth');
      return null;
    }
    
    try {
      console.log('🔍 Fetching merchant for userId:', userId);
      
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id, image_url, shop_name')
        .eq('user_id', userId)
        .single();

      if (merchantError) {
        console.error('Error fetching merchant:', merchantError);
        if (merchantError.code === 'PGRST116') {
          toast.error('Merchant profile not found. Please complete onboarding.');
          navigate('/merchant/onboarding');
          return null;
        }
        throw merchantError;
      }

      if (merchantData) {
        console.log('✅ Merchant found:', merchantData);
        setMerchantId(merchantData.id);
        setShopImage(merchantData.image_url);
        setShopName(merchantData.shop_name || 'Merchant');
        return merchantData.id;
      }

      toast.error('Merchant profile not found. Please complete onboarding.');
      navigate('/merchant/onboarding');
      return null;
    } catch (error) {
      console.error('Exception in fetchMerchantId:', error);
      toast.error('Failed to load merchant profile');
      throw error;
    }
  };

  const fetchDashboardData = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Get merchant ID first with retries
      const mId = await retryWithBackoff(fetchMerchantId);
      if (!mId) return;

      console.log('📊 Fetching dashboard data for merchant:', mId);

      // Get today's date in ISO format (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];

      // Fetch bookings count for today with retries
      const fetchBookingsCount = async () => {
        const { count: todayBookingsCount, error: bookingsCountError } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', mId)
          .eq('date', today);

        if (bookingsCountError) {
          console.error('Error fetching bookings count:', bookingsCountError);
          throw bookingsCountError;
        }

        return todayBookingsCount || 0;
      };

      const todayCount = await retryWithBackoff(fetchBookingsCount);
      setBookingsToday(todayCount);
      console.log('📅 Today bookings count:', todayCount);

      // Fetch earnings data with retries
      const fetchEarningsData = async () => {
        const { data: completedBookings, error: earningsError } = await supabase
          .from('bookings')
          .select(`
            service_id,
            services!left(price)
          `)
          .eq('merchant_id', mId)
          .eq('payment_status', 'completed');

        if (earningsError) {
          console.error('Error fetching earnings data:', earningsError);
          throw earningsError;
        }

        return completedBookings || [];
      };

      const completedBookings = await retryWithBackoff(fetchEarningsData);
      
      // Calculate total earnings with fallback for missing prices
      const totalEarnings = completedBookings.reduce((sum, booking) => {
        const price = booking.services?.price || 0;
        return sum + price;
      }, 0);
      
      setTotalEarnings(totalEarnings);
      console.log('💰 Total earnings calculated:', totalEarnings);

      // Fetch recent bookings with retries
      const fetchRecentBookings = async () => {
        const { data: recentBookingsData, error: recentBookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            date,
            time_slot,
            status,
            payment_status,
            customer_name,
            customer_phone,
            customer_email,
            stylist_name,
            service:service_id!left (name),
            user_id
          `)
          .eq('merchant_id', mId)
          .eq('date', today)
          .order('time_slot', { ascending: true })
          .limit(5);

        if (recentBookingsError) {
          console.error('Error fetching recent bookings:', recentBookingsError);
          throw recentBookingsError;
        }

        return recentBookingsData || [];
      };

      const recentBookingsData = await retryWithBackoff(fetchRecentBookings);

      // Process bookings and ensure we have customer names
      const bookingsWithDetails = await Promise.all(
        recentBookingsData.map(async (booking) => {
          let customerName = booking.customer_name || 'Unknown Customer';

          // If no customer name in booking, try to fetch from profiles
          if (!booking.customer_name && booking.user_id) {
            try {
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', booking.user_id)
                .single();

              if (!userError && userData?.name) {
                customerName = userData.name;
              }
            } catch (error) {
              console.warn('Could not fetch user profile:', error);
            }
          }

          return {
            ...booking,
            customer_name: customerName,
            stylist_name: booking.stylist_name || 'Unassigned'
          };
        })
      );

      setRecentBookings(bookingsWithDetails as Booking[]);
      console.log('📋 Recent bookings loaded:', bookingsWithDetails.length);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
      
      // Set fallback values
      setBookingsToday(0);
      setTotalEarnings(0);
      setRecentBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up realtime subscription only if we have a valid merchantId
    let subscription: any = null;
    
    if (merchantId) {
      console.log('🔄 Setting up realtime subscription for merchant:', merchantId);
      
      const bookingsChannel = supabase
        .channel('dashboard-bookings-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `merchant_id=eq.${merchantId}`
        }, (payload) => {
          console.log('🔔 Realtime booking change detected:', payload);
          // Refresh data when bookings change
          fetchDashboardData();
        })
        .subscribe((status) => {
          console.log('📡 Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to realtime updates');
          } else {
            console.error('❌ Realtime subscription failed with status:', status);
          }
        });

      subscription = bookingsChannel;
    }

    // Cleanup subscription
    return () => {
      if (subscription) {
        console.log('🧹 Cleaning up realtime subscription');
        supabase.removeChannel(subscription);
      }
    };
  }, [userId, merchantId]);

  // Dashboard stats - only bookings today and total earnings
  const dashboardStats = [
    {
      id: 1,
      title: 'Bookings Today',
      value: isLoading ? '...' : bookingsToday,
      color: 'bg-booqit-primary/10 text-booqit-primary'
    },
    {
      id: 2,
      title: 'Total Earnings',
      value: isLoading ? '...' : `₹${totalEarnings.toFixed(0)}`,
      color: 'bg-green-100 text-green-700'
    }
  ];

  // Error state UI
  if (error && !isLoading) {
    return (
      <div className="p-4 md:p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500">Welcome back!</p>
          </div>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Unable to load dashboard data</h3>
            <p className="text-red-600 mb-4">Please refresh the page or contact support if the problem persists.</p>
            <Button onClick={fetchDashboardData} variant="outline" className="border-red-300 text-red-700">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500">Loading data...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1, 2].map(i => (
            <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="animate-pulse flex flex-col space-y-2">
                  <div className="h-6 w-20 bg-gray-200 rounded-lg"></div>
                  <div className="h-8 w-12 bg-gray-300 rounded-lg"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-none shadow-md mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-md"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20">
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center mb-6"
      >
        <div>
          <h1 className="text-2xl font-light">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {shopName}!</p>
        </div>
        <Avatar className="h-12 w-12">
          <AvatarImage src={shopImage || undefined} alt={shopName} />
          <AvatarFallback className="bg-booqit-primary/10 text-booqit-primary">
            {shopName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {dashboardStats.map(stat => (
              <Card key={stat.id} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className={`inline-flex rounded-lg p-2 mb-2 ${stat.color}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <h3 className="font-normal text-2xl">{stat.value}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Analytics Button - Moved to prominent position */}
        <motion.div variants={itemVariants} className="mb-6">
          <Button
            onClick={() => navigate('/merchant/analytics')}
            className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-white py-6 text-lg"
            size="lg"
          >
            <BarChart3 className="h-6 w-6 mr-3" />
            View Analytics
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md mb-6">
            <CardHeader className="pb-2 px-4 md:px-6">
              <CardTitle className="font-light text-xl">Today's Bookings</CardTitle>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="space-y-3">
                {recentBookings.length > 0 ? (
                  recentBookings.map(booking => (
                    <div
                      key={booking.id}
                      className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3"
                    >
                      {/* Header with customer name and status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-600" />
                          <h4 className="font-semibold text-gray-900">
                            {booking.customer_name || 'Walk-in Customer'}
                          </h4>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : booking.status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>

                      {/* Service and time information */}
                      <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{booking.service?.name || 'Service'}</span>
                          <span className="font-semibold text-booqit-primary">
                            {formatTimeToAmPm(booking.time_slot)}
                          </span>
                        </div>
                        
                        {/* Stylist information */}
                        {booking.stylist_name && (
                          <div className="flex items-center space-x-2">
                            <Scissors className="h-4 w-4 text-gray-500" />
                            <span>Stylist: {booking.stylist_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No bookings for today</p>
                    <p className="text-gray-400 text-sm mt-1">New bookings will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
