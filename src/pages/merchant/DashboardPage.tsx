
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Booking } from '@/types';
import { format, isToday } from 'date-fns';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { 
  CalendarDays, 
  DollarSign, 
  Users, 
  Briefcase, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle 
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [bookingsToday, setBookingsToday] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [bookingStats, setBookingStats] = useState({
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0
  });

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  useEffect(() => {
    const fetchMerchantId = async () => {
      if (!userId) return;

      try {
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', userId)
          .single();

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

        // Get all bookings for analytics
        const { data: allBookings, error: allBookingsError } = await supabase
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
            service:services(name, price),
            user_id
          `)
          .eq('merchant_id', mId)
          .order('date', { ascending: false })
          .order('time_slot', { ascending: false });

        if (allBookingsError) {
          console.error('Error fetching all bookings:', allBookingsError);
        } else if (allBookings) {
          // Calculate booking stats
          const stats = {
            pending: allBookings.filter(b => b.status === 'pending').length,
            confirmed: allBookings.filter(b => b.status === 'confirmed').length,
            completed: allBookings.filter(b => b.status === 'completed').length,
            cancelled: allBookings.filter(b => b.status === 'cancelled').length
          };
          setBookingStats(stats);

          // Get today's bookings
          const todaysBookings = allBookings.filter(b => b.date === today);
          setBookingsToday(todaysBookings.length);

          // Calculate total earnings from completed bookings
          const completedBookings = allBookings.filter(b => b.payment_status === 'completed');
          const totalEarnings = completedBookings.reduce((sum, booking) => {
            return sum + (booking.service?.price || 0);
          }, 0);
          setTotalEarnings(totalEarnings);

          // Calculate today's earnings
          const todaysCompletedBookings = todaysBookings.filter(b => b.payment_status === 'completed');
          const todaysEarnings = todaysCompletedBookings.reduce((sum, booking) => {
            return sum + (booking.service?.price || 0);
          }, 0);
          setTodaysEarnings(todaysEarnings);

          // Get unique customers count
          const uniqueCustomers = new Set(allBookings.map(booking => booking.user_id));
          setCustomersCount(uniqueCustomers.size);

          // Process recent bookings with customer names
          const bookingsWithDetails = await Promise.all(
            todaysBookings.slice(0, 5).map(async (booking) => {
              let customerName = booking.customer_name || 'Unknown Customer';
              
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
                ...booking,
                customer_name: customerName,
                stylist_name: booking.stylist_name || 'Unassigned'
              };
            })
          );
          
          setRecentBookings(bookingsWithDetails as Booking[]);
        }

        // Count services offered by the merchant
        const { count: servicesCount, error: servicesCountError } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', mId);

        if (servicesCountError) {
          console.error('Error fetching services count:', servicesCountError);
        } else {
          setServicesCount(servicesCount || 0);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast('Error loading dashboard', {
          description: 'Could not fetch dashboard data',
          style: { backgroundColor: 'red', color: 'white' }
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Set up realtime subscription
    if (merchantId) {
      const bookingsChannel = supabase
        .channel('dashboard-bookings-changes')
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `merchant_id=eq.${merchantId}`
          }, 
          () => {
            // Refresh data when bookings change
            fetchDashboardData();
          }
        )
        .subscribe();

      // Cleanup subscription
      return () => {
        supabase.removeChannel(bookingsChannel);
      };
    }
  }, [userId, merchantId]);

  // Dashboard stats based on real data
  const dashboardStats = [
    { 
      id: 1, 
      title: 'Today\'s Bookings', 
      value: isLoading ? '...' : bookingsToday, 
      color: 'bg-booqit-primary/10 text-booqit-primary',
      icon: CalendarDays
    },
    { 
      id: 2, 
      title: 'Today\'s Earnings', 
      value: isLoading ? '...' : `₹${todaysEarnings.toFixed(0)}`, 
      color: 'bg-green-100 text-green-700',
      icon: DollarSign
    },
    { 
      id: 3, 
      title: 'Total Customers', 
      value: isLoading ? '...' : customersCount, 
      color: 'bg-blue-100 text-blue-700',
      icon: Users
    },
    { 
      id: 4, 
      title: 'Active Services', 
      value: isLoading ? '...' : servicesCount, 
      color: 'bg-amber-100 text-amber-700',
      icon: Briefcase
    }
  ];

  const statusCards = [
    {
      title: 'Pending',
      value: bookingStats.pending,
      color: 'bg-yellow-100 text-yellow-700',
      icon: Clock
    },
    {
      title: 'Confirmed',
      value: bookingStats.confirmed,
      color: 'bg-blue-100 text-blue-700',
      icon: CheckCircle
    },
    {
      title: 'Completed',
      value: bookingStats.completed,
      color: 'bg-green-100 text-green-700',
      icon: TrendingUp
    },
    {
      title: 'Cancelled',
      value: bookingStats.cancelled,
      color: 'bg-red-100 text-red-700',
      icon: XCircle
    }
  ];

  if (isLoading) {
    return (
      <div className="p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500">Loading data...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
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
      </div>
    );
  }

  return (
    <div className="p-6 pb-20">
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome back, Merchant!</p>
        </div>
        <div className="h-10 w-10 bg-booqit-primary/10 text-booqit-primary rounded-full flex items-center justify-center">
          <span className="font-medium">M</span>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main Stats */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {dashboardStats.map(stat => {
              const IconComponent = stat.icon;
              return (
                <Card key={stat.id} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className={`inline-flex rounded-lg p-2 mb-2 ${stat.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Booking Status Analytics */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Booking Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statusCards.map((card, index) => {
                  const IconComponent = card.icon;
                  return (
                    <div key={index} className="text-center">
                      <div className={`inline-flex rounded-lg p-3 mb-2 ${card.color}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                      <p className="text-xl font-bold">{card.value}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Earnings Overview */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Earnings Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="inline-flex rounded-lg p-3 mb-2 bg-green-100 text-green-700">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-gray-500 mb-1">Today's Earnings</p>
                  <p className="text-xl font-bold text-green-600">₹{todaysEarnings.toFixed(0)}</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex rounded-lg p-3 mb-2 bg-blue-100 text-blue-700">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
                  <p className="text-xl font-bold text-blue-600">₹{totalEarnings.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Bookings */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Today's Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentBookings.length > 0 ? (
                  recentBookings.map(booking => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div>
                        <h4 className="font-medium">{booking.customer_name || 'Walk-in Customer'}</h4>
                        <div className="flex gap-2 items-center">
                          <span className="text-sm text-gray-500">{booking.service?.name}</span>
                          <span className="text-sm text-gray-400">•</span>
                          <span className="text-sm text-gray-500">{formatTimeToAmPm(booking.time_slot)}</span>
                          {booking.stylist_name && (
                            <>
                              <span className="text-sm text-gray-400">•</span>
                              <span className="text-sm text-gray-500">{booking.stylist_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : booking.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                        {booking.service?.price && (
                          <span className="text-xs text-gray-500 mt-1">₹{booking.service.price}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <CalendarDays className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No bookings for today</p>
                    <p className="text-sm text-gray-400">Your schedule is free today</p>
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
