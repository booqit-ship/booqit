import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Booking } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
const DashboardPage: React.FC = () => {
  const {
    userId
  } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [bookingsToday, setBookingsToday] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      y: 20,
      opacity: 0
    },
    visible: {
      y: 0,
      opacity: 1
    }
  };
  useEffect(() => {
    const fetchMerchantId = async () => {
      if (!userId) return;
      try {
        const {
          data: merchantData,
          error: merchantError
        } = await supabase.from('merchants').select('id').eq('user_id', userId).single();
        if (merchantError) {
          console.error('Error fetching merchant ID:', merchantError);
          return;
        }
        if (merchantData) {
          setMerchantId(merchantData.id);
          return merchantData.id;
        }
      } catch (error) {
        console.error('Error fetching merchant ID:', error);
      }
      return null;
    };
    const fetchDashboardData = async () => {
      if (!userId) return;
      try {
        setIsLoading(true);

        // Get merchant ID first
        const mId = await fetchMerchantId();
        if (!mId) return;

        // Get today's date in ISO format (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        // Get bookings count for today
        const {
          count: todayBookingsCount,
          error: bookingsCountError
        } = await supabase.from('bookings').select('*', {
          count: 'exact',
          head: true
        }).eq('merchant_id', mId).eq('date', today);
        if (bookingsCountError) {
          console.error('Error fetching bookings count:', bookingsCountError);
        } else {
          setBookingsToday(todayBookingsCount || 0);
        }

        // Get all bookings with payment status 'completed' to calculate earnings
        const {
          data: completedBookings,
          error: earningsError
        } = await supabase.from('bookings').select('service_id').eq('merchant_id', mId).eq('payment_status', 'completed');
        if (earningsError) {
          console.error('Error fetching earnings data:', earningsError);
        } else if (completedBookings && completedBookings.length > 0) {
          // Get service prices for all completed bookings
          const serviceIds = completedBookings.map(booking => booking.service_id);
          const {
            data: services,
            error: servicesError
          } = await supabase.from('services').select('price').in('id', serviceIds);
          if (servicesError) {
            console.error('Error fetching service prices:', servicesError);
          } else if (services) {
            // Sum up all service prices
            const totalEarnings = services.reduce((sum, service) => sum + (service.price || 0), 0);
            setTotalEarnings(totalEarnings);
          }
        } else {
          setTotalEarnings(0);
        }

        // Count unique customers
        const {
          data: uniqueCustomers,
          error: customersError
        } = await supabase.from('bookings').select('user_id').eq('merchant_id', mId);
        if (customersError) {
          console.error('Error fetching unique customers:', customersError);
        } else if (uniqueCustomers) {
          // Get unique count of user_ids
          const uniqueUserIds = new Set(uniqueCustomers.map(booking => booking.user_id));
          setCustomersCount(uniqueUserIds.size);
        }

        // Count services offered by the merchant
        const {
          count: servicesCount,
          error: servicesCountError
        } = await supabase.from('services').select('*', {
          count: 'exact',
          head: true
        }).eq('merchant_id', mId);
        if (servicesCountError) {
          console.error('Error fetching services count:', servicesCountError);
        } else {
          setServicesCount(servicesCount || 0);
        }

        // Fetch recent bookings for today with better customer and stylist name fetching
        const {
          data: recentBookingsData,
          error: recentBookingsError
        } = await supabase.from('bookings').select(`
            id,
            date,
            time_slot,
            status,
            payment_status,
            customer_name,
            customer_phone,
            customer_email,
            stylist_name,
            service:service_id (name),
            user_id
          `).eq('merchant_id', mId).eq('date', today).order('time_slot', {
          ascending: true
        }).limit(5);
        if (recentBookingsError) {
          console.error('Error fetching recent bookings:', recentBookingsError);
        } else if (recentBookingsData) {
          // Process bookings and ensure we have customer names
          const bookingsWithDetails = await Promise.all(recentBookingsData.map(async booking => {
            let customerName = booking.customer_name || 'Unknown Customer';

            // If no customer name in booking, try to fetch from profiles
            if (!booking.customer_name && booking.user_id) {
              const {
                data: userData,
                error: userError
              } = await supabase.from('profiles').select('name').eq('id', booking.user_id).single();
              if (!userError && userData?.name) {
                customerName = userData.name;
              }
            }
            return {
              ...booking,
              customer_name: customerName,
              stylist_name: booking.stylist_name || 'Unassigned'
            };
          }));
          setRecentBookings(bookingsWithDetails as Booking[]);
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
    if (merchantId) {
      const bookingsChannel = supabase.channel('dashboard-bookings-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `merchant_id=eq.${merchantId}`
      }, () => {
        // Refresh data when bookings change
        fetchDashboardData();
      }).subscribe();

      // Cleanup subscription
      return () => {
        supabase.removeChannel(bookingsChannel);
      };
    }
  }, [userId, merchantId]);

  // Dashboard stats based on real data
  const dashboardStats = [{
    id: 1,
    title: 'Bookings Today',
    value: isLoading ? '...' : bookingsToday,
    color: 'bg-booqit-primary/10 text-booqit-primary'
  }, {
    id: 2,
    title: 'Total Earnings',
    value: isLoading ? '...' : `₹${totalEarnings.toFixed(0)}`,
    color: 'bg-green-100 text-green-700'
  }, {
    id: 3,
    title: 'Customers',
    value: isLoading ? '...' : customersCount,
    color: 'bg-blue-100 text-blue-700'
  }, {
    id: 4,
    title: 'Services',
    value: isLoading ? '...' : servicesCount,
    color: 'bg-amber-100 text-amber-700'
  }];
  if (isLoading) {
    return <div className="p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500">Loading data...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Card key={i} className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="animate-pulse flex flex-col space-y-2">
                  <div className="h-6 w-20 bg-gray-200 rounded-lg"></div>
                  <div className="h-8 w-12 bg-gray-300 rounded-lg"></div>
                </div>
              </CardContent>
            </Card>)}
        </div>
        <Card className="border-none shadow-md mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-md"></div>)}
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="p-6 pb-20">
      <motion.div initial={{
      y: -10,
      opacity: 0
    }} animate={{
      y: 0,
      opacity: 1
    }} className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-light">Dashboard</h1>
          <p className="text-gray-500">Welcome back, Merchant!</p>
        </div>
        <div className="h-10 w-10 bg-booqit-primary/10 text-booqit-primary rounded-full flex items-center justify-center">
          <span className="font-medium">M</span>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {dashboardStats.map(stat => <Card key={stat.id} className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className={`inline-flex rounded-lg p-2 mb-2 ${stat.color}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                </CardContent>
              </Card>)}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="font-light text-lg">Today's Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentBookings.length > 0 ? recentBookings.map(booking => <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <h4 className="text-base font-light">{booking.customer_name || 'Walk-in Customer'}</h4>
                        <div className="flex gap-2 items-center">
                          <span className="text-sm text-gray-500">{booking.service?.name}</span>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-gray-500">{formatTimeToAmPm(booking.time_slot)}</span>
                          {booking.stylist_name && <>
                              <span className="text-sm text-gray-400">•</span>
                              <span className="text-sm text-gray-500">{booking.stylist_name}</span>
                            </>}
                        </div>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'completed' ? 'bg-blue-100 text-blue-700' : booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>) : <div className="text-center py-6">
                    <p className="text-gray-500">No bookings for today</p>
                  </div>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>;
};
export default DashboardPage;