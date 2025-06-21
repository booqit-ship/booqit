
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
import { User, Scissors, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userId) return;
      
      try {
        setIsLoading(true);

        // Get merchant ID first
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('id, image_url, shop_name')
          .eq('user_id', userId)
          .single();

        if (merchantError) {
          console.error('Error fetching merchant ID:', merchantError);
          return;
        }

        if (!merchantData) {
          console.error('No merchant found for user');
          return;
        }

        const mId = merchantData.id;
        setMerchantId(mId);
        setShopImage(merchantData.image_url);
        setShopName(merchantData.shop_name || 'Merchant');

        // Get today's date in ISO format (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        // Get bookings count for today - all statuses except cancelled
        const { data: todayBookings, error: bookingsCountError } = await supabase
          .from('bookings')
          .select('id')
          .eq('merchant_id', mId)
          .eq('date', today)
          .in('status', ['pending', 'confirmed', 'completed']);

        if (bookingsCountError) {
          console.error('Error fetching bookings count:', bookingsCountError);
          setBookingsToday(0);
        } else {
          setBookingsToday(todayBookings?.length || 0);
        }

        // Get total earnings ONLY from completed bookings with completed payment status
        const { data: completedBookings, error: earningsError } = await supabase
          .from('bookings')
          .select(`
            id,
            services!inner(price)
          `)
          .eq('merchant_id', mId)
          .eq('status', 'completed')
          .eq('payment_status', 'completed');

        if (earningsError) {
          console.error('Error fetching earnings data:', earningsError);
          setTotalEarnings(0);
        } else if (completedBookings && completedBookings.length > 0) {
          // Sum up all service prices
          const totalEarnings = completedBookings.reduce((sum, booking) => {
            return sum + (booking.services?.price || 0);
          }, 0);
          setTotalEarnings(totalEarnings);
        } else {
          setTotalEarnings(0);
        }

        // Fetch ALL bookings for today with customer and stylist details - REMOVED .limit(5)
        const { data: recentBookingsData, error: recentBookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            merchant_id,
            service_id,
            date,
            time_slot,
            status,
            payment_status,
            customer_name,
            customer_phone,
            customer_email,
            stylist_name,
            user_id,
            created_at,
            services!inner(name)
          `)
          .eq('merchant_id', mId)
          .eq('date', today)
          .in('status', ['pending', 'confirmed', 'completed'])
          .order('time_slot', { ascending: true });

        if (recentBookingsError) {
          console.error('Error fetching recent bookings:', recentBookingsError);
          setRecentBookings([]);
        } else if (recentBookingsData) {
          // Process bookings and ensure we have customer names
          const bookingsWithDetails = await Promise.all(
            recentBookingsData.map(async (booking) => {
              let customerName = booking.customer_name || 'Unknown Customer';

              // If no customer name in booking, try to fetch from profiles
              if (!booking.customer_name && booking.user_id) {
                const { data: userData, error: userError } = await supabase
                  .from('profiles')
                  .select('name')
                  .eq('id', booking.user_id)
                  .single();

                if (!userError && userData?.name) {
                  customerName = userData.name;
                }
              }

              return {
                id: booking.id,
                merchant_id: booking.merchant_id,
                service_id: booking.service_id,
                user_id: booking.user_id,
                date: booking.date,
                time_slot: booking.time_slot,
                status: booking.status,
                payment_status: booking.payment_status,
                customer_name: customerName,
                customer_phone: booking.customer_phone,
                customer_email: booking.customer_email,
                stylist_name: booking.stylist_name || 'Unassigned',
                created_at: booking.created_at,
                service: booking.services
              } as Booking;
            })
          );

          setRecentBookings(bookingsWithDetails);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast('Error loading dashboard', {
          description: 'Could not fetch dashboard data',
          style: {
            backgroundColor: 'red',
            color: 'white'
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Set up realtime subscription
    let subscription: any = null;
    
    if (merchantId) {
      subscription = supabase
        .channel('dashboard-bookings-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `merchant_id=eq.${merchantId}`
        }, () => {
          // Refresh data when bookings change
          fetchDashboardData();
        })
        .subscribe();
    }

    // Cleanup subscription
    return () => {
      if (subscription) {
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
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
                          <span className="font-medium text-gray-800">{booking.service?.name}</span>
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
                  <div className="text-center py-6">
                    <p className="text-gray-500">No bookings for today</p>
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
