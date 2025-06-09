
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, Users, Clock, Star, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { BookingService } from '@/types';

interface DashboardStats {
  totalBookings: number;
  todayBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageRating: number;
  totalCustomers: number;
}

interface DashboardBooking {
  id: string;
  customer_name: string | null;
  date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  service?: {
    name: string;
    price: number;
    duration: number;
  };
  services?: BookingService[];
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    todayBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    totalCustomers: 0
  });
  const [recentBookings, setRecentBookings] = useState<DashboardBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  const fetchDashboardData = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      // Get merchant info
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (merchantError) throw merchantError;

      const merchantId = merchantData.id;
      const today = format(new Date(), 'yyyy-MM-dd');
      const currentMonth = format(new Date(), 'yyyy-MM');

      // Fetch bookings with services
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:service_id (
            name,
            price,
            duration
          )
        `)
        .eq('merchant_id', merchantId);

      if (bookingsError) throw bookingsError;

      // Process recent bookings with proper type casting
      const processedBookings: DashboardBooking[] = bookingsData?.slice(0, 5).map(booking => ({
        id: booking.id,
        customer_name: booking.customer_name,
        date: booking.date,
        time_slot: booking.time_slot,
        status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
        service: booking.service,
        services: Array.isArray(booking.services) ? (booking.services as unknown) as BookingService[] : undefined
      })) || [];

      setRecentBookings(processedBookings);

      // Calculate stats
      const todayBookings = bookingsData?.filter(b => b.date === today && b.status !== 'cancelled').length || 0;
      const completedBookings = bookingsData?.filter(b => b.status === 'completed') || [];
      const monthlyBookings = bookingsData?.filter(b => 
        b.date.startsWith(currentMonth) && b.status === 'completed'
      ) || [];

      // Calculate revenue from completed bookings
      let totalRevenue = 0;
      let monthlyRevenue = 0;

      completedBookings.forEach(booking => {
        const revenue = calculateBookingRevenue(booking);
        totalRevenue += revenue;
        if (booking.date.startsWith(currentMonth)) {
          monthlyRevenue += revenue;
        }
      });

      // Get unique customers
      const uniqueCustomers = new Set(bookingsData?.map(b => b.user_id)).size;

      // Fetch average rating
      const { data: ratingsData } = await supabase
        .from('reviews')
        .select('rating')
        .in('booking_id', bookingsData?.map(b => b.id) || []);

      const averageRating = ratingsData?.length > 0 
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
        : 0;

      setStats({
        totalBookings: bookingsData?.length || 0,
        todayBookings,
        totalRevenue,
        monthlyRevenue,
        averageRating: Number(averageRating.toFixed(1)),
        totalCustomers: uniqueCustomers
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBookingRevenue = (booking: any) => {
    // If booking has multiple services, sum their prices
    if (booking.services && Array.isArray(booking.services)) {
      return booking.services.reduce((total: number, service: BookingService) => total + service.price, 0);
    }
    // Fallback to single service price
    return booking.service?.price || 0;
  };

  const getBookingDisplayText = (booking: DashboardBooking) => {
    if (booking.services && booking.services.length > 1) {
      return `${booking.services.length} services`;
    }
    if (booking.services && booking.services.length === 1) {
      return booking.services[0].name;
    }
    return booking.service?.name || 'Service';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.monthlyRevenue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating}/5</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length > 0 ? (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{getBookingDisplayText(booking)}</p>
                      <p className="text-sm text-gray-500">
                        {booking.customer_name} - {booking.date} at {booking.time_slot}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent bookings found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
