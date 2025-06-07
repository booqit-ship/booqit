
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { ArrowLeft, TrendingUp, Calendar, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EarningsData {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

interface BookingsData {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

interface StaffEarnings {
  id: string;
  name: string;
  earnings: number;
  bookings: number;
}

const AnalyticsPage: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningsData>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });
  const [bookings, setBookings] = useState<BookingsData>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });
  const [staffData, setStaffData] = useState<StaffEarnings[]>([]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!userId) return;
      
      try {
        setIsLoading(true);

        // Get merchant ID
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (merchantError || !merchantData) {
          console.error('Error fetching merchant ID:', merchantError);
          return;
        }

        const mId = merchantData.id;
        setMerchantId(mId);

        // Date calculations
        const today = new Date().toISOString().split('T')[0];
        const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

        // Fetch all completed bookings with service data
        const { data: completedBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            date,
            service_id,
            staff_id,
            services!inner(price)
          `)
          .eq('merchant_id', mId)
          .eq('payment_status', 'completed');

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
          return;
        }

        if (completedBookings) {
          // Calculate earnings
          const totalEarnings = completedBookings.reduce((sum, booking) => 
            sum + (booking.services?.price || 0), 0
          );
          
          const todayEarnings = completedBookings
            .filter(booking => booking.date === today)
            .reduce((sum, booking) => sum + (booking.services?.price || 0), 0);
          
          const weekEarnings = completedBookings
            .filter(booking => booking.date >= weekStart && booking.date <= weekEnd)
            .reduce((sum, booking) => sum + (booking.services?.price || 0), 0);
          
          const monthEarnings = completedBookings
            .filter(booking => booking.date >= monthStart && booking.date <= monthEnd)
            .reduce((sum, booking) => sum + (booking.services?.price || 0), 0);

          setEarnings({
            total: totalEarnings,
            today: todayEarnings,
            thisWeek: weekEarnings,
            thisMonth: monthEarnings,
          });

          // Calculate bookings counts
          const totalBookingsCount = completedBookings.length;
          const todayBookingsCount = completedBookings.filter(b => b.date === today).length;
          const weekBookingsCount = completedBookings.filter(b => b.date >= weekStart && b.date <= weekEnd).length;
          const monthBookingsCount = completedBookings.filter(b => b.date >= monthStart && b.date <= monthEnd).length;

          setBookings({
            total: totalBookingsCount,
            today: todayBookingsCount,
            thisWeek: weekBookingsCount,
            thisMonth: monthBookingsCount,
          });
        }

        // Fetch staff data
        const { data: staffList, error: staffError } = await supabase
          .from('staff')
          .select('id, name')
          .eq('merchant_id', mId);

        if (staffError) {
          console.error('Error fetching staff:', staffError);
          return;
        }

        if (staffList && completedBookings) {
          const staffEarningsData = staffList.map(staff => {
            const staffBookings = completedBookings.filter(b => b.staff_id === staff.id);
            const staffEarnings = staffBookings.reduce((sum, booking) => 
              sum + (booking.services?.price || 0), 0
            );
            
            return {
              id: staff.id,
              name: staff.name,
              earnings: staffEarnings,
              bookings: staffBookings.length,
            };
          });

          setStaffData(staffEarningsData);
        }

      } catch (error) {
        console.error('Error fetching analytics data:', error);
        toast('Error loading analytics', {
          description: 'Could not fetch analytics data',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 pb-20">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/merchant')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="space-y-4">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-6 w-20 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 w-16 bg-gray-300 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-20">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/merchant')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Earnings Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
          <h2 className="text-xl font-semibold">Earnings</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Earnings</p>
              <p className="text-2xl font-bold text-green-600">₹{earnings.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Today</p>
              <p className="text-xl font-semibold">₹{earnings.today}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">This Week</p>
              <p className="text-xl font-semibold">₹{earnings.thisWeek}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">This Month</p>
              <p className="text-xl font-semibold">₹{earnings.thisMonth}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bookings Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Calendar className="h-5 w-5 mr-2 text-blue-600" />
          <h2 className="text-xl font-semibold">Bookings</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Bookings</p>
              <p className="text-2xl font-bold text-blue-600">{bookings.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Today</p>
              <p className="text-xl font-semibold">{bookings.today}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">This Week</p>
              <p className="text-xl font-semibold">{bookings.thisWeek}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">This Month</p>
              <p className="text-xl font-semibold">{bookings.thisMonth}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 mr-2 text-purple-600" />
          <h2 className="text-xl font-semibold">Staff Performance</h2>
        </div>
        
        <Card>
          <CardContent className="p-4">
            {staffData.length > 0 ? (
              <div className="space-y-3">
                {staffData.map((staff) => (
                  <div key={staff.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="font-medium">{staff.name}</p>
                      <p className="text-sm text-gray-500">{staff.bookings} bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">₹{staff.earnings}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No staff data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
