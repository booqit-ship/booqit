
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { Wallet, TrendingUp, Calendar, Users, BarChart3 } from 'lucide-react';

interface EarningsByStaff {
  staff_id: string;
  staff_name: string;
  total_earnings: number;
  total_bookings: number;
}

interface PeriodStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
}

interface BookingStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
}

const EarningsAnalyticsPage: React.FC = () => {
  const [earningsStats, setEarningsStats] = useState<PeriodStats>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    allTime: 0
  });
  
  const [bookingStats, setBookingStats] = useState<BookingStats>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    allTime: 0
  });
  
  const [staffEarnings, setStaffEarnings] = useState<EarningsByStaff[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { userId } = useAuth();

  // Fetch merchant ID
  useEffect(() => {
    const fetchMerchantId = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', userId)
          .single();
          
        if (error) throw error;
        setMerchantId(data.id);
      } catch (error) {
        console.error('Error fetching merchant ID:', error);
      }
    };
    
    fetchMerchantId();
  }, [userId]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!merchantId) return;
      
      setIsLoading(true);
      try {
        const today = new Date();
        const yesterday = subDays(today, 1);
        const weekStart = startOfWeek(today);
        const weekEnd = endOfWeek(today);
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        
        const todayStr = format(today, 'yyyy-MM-dd');
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
        
        // Fetch all bookings with service and staff data
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            date,
            status,
            staff_id,
            service:service_id (
              price
            ),
            staff (
              name
            )
          `)
          .eq('merchant_id', merchantId);
          
        if (bookingsError) throw bookingsError;
        
        // Initialize stats
        let todayEarnings = 0, weekEarnings = 0, monthEarnings = 0, allTimeEarnings = 0;
        let todayBookings = 0, weekBookings = 0, monthBookings = 0, allTimeBookings = 0;
        
        // Staff earnings map
        const staffEarningsMap = new Map<string, EarningsByStaff>();
        
        bookingsData.forEach(booking => {
          const bookingDate = new Date(booking.date);
          const dateStr = booking.date;
          const amount = booking.service?.price || 0;
          const staffId = booking.staff_id;
          const staffName = booking.staff?.name || 'Unknown Staff';
          
          // Initialize staff data if not exists
          if (staffId && !staffEarningsMap.has(staffId)) {
            staffEarningsMap.set(staffId, {
              staff_id: staffId,
              staff_name: staffName,
              total_earnings: 0,
              total_bookings: 0
            });
          }
          
          // Count all bookings (regardless of status)
          allTimeBookings++;
          
          if (dateStr === todayStr) {
            todayBookings++;
          }
          
          if (bookingDate >= weekStart && bookingDate <= weekEnd) {
            weekBookings++;
          }
          
          if (bookingDate >= monthStart && bookingDate <= monthEnd) {
            monthBookings++;
          }
          
          // Only count completed bookings for earnings
          if (booking.status === 'completed') {
            allTimeEarnings += amount;
            
            if (dateStr === todayStr) {
              todayEarnings += amount;
            }
            
            if (bookingDate >= weekStart && bookingDate <= weekEnd) {
              weekEarnings += amount;
            }
            
            if (bookingDate >= monthStart && bookingDate <= monthEnd) {
              monthEarnings += amount;
            }
            
            // Add to staff earnings
            if (staffId) {
              const staffData = staffEarningsMap.get(staffId);
              if (staffData) {
                staffData.total_earnings += amount;
              }
            }
          }
          
          // Count bookings for staff (all statuses)
          if (staffId) {
            const staffData = staffEarningsMap.get(staffId);
            if (staffData) {
              staffData.total_bookings++;
            }
          }
        });
        
        setEarningsStats({
          today: todayEarnings,
          thisWeek: weekEarnings,
          thisMonth: monthEarnings,
          allTime: allTimeEarnings
        });
        
        setBookingStats({
          today: todayBookings,
          thisWeek: weekBookings,
          thisMonth: monthBookings,
          allTime: allTimeBookings
        });
        
        setStaffEarnings(Array.from(staffEarningsMap.values()));
        
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch analytics data. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [merchantId]);

  const getFilteredStaffData = () => {
    // For now, showing all-time data since we already calculated it
    // In a real app, you'd filter based on selectedPeriod
    return staffEarnings;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-booqit-primary/10 p-2 rounded-full">
          <BarChart3 className="h-6 w-6 text-booqit-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-booqit-dark">Earnings Analytics</h1>
          <p className="text-booqit-dark/70">Comprehensive business performance insights</p>
        </div>
      </div>

      {/* Earnings Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-booqit-dark flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Earnings Overview
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-booqit-dark/60 text-sm">Today</p>
                <p className="text-2xl font-bold text-booqit-primary">₹{earningsStats.today.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-booqit-dark/60 text-sm">This Week</p>
                <p className="text-2xl font-bold text-green-600">₹{earningsStats.thisWeek.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-booqit-dark/60 text-sm">This Month</p>
                <p className="text-2xl font-bold text-blue-600">₹{earningsStats.thisMonth.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-booqit-dark/60 text-sm">All Time</p>
                <p className="text-2xl font-bold text-purple-600">₹{earningsStats.allTime.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bookings Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-booqit-dark flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Bookings Overview
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-booqit-dark/60 text-sm">Today</p>
                <p className="text-2xl font-bold text-booqit-primary">{bookingStats.today}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-booqit-dark/60 text-sm">This Week</p>
                <p className="text-2xl font-bold text-green-600">{bookingStats.thisWeek}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-booqit-dark/60 text-sm">This Month</p>
                <p className="text-2xl font-bold text-blue-600">{bookingStats.thisMonth}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-booqit-dark/60 text-sm">All Time</p>
                <p className="text-2xl font-bold text-purple-600">{bookingStats.allTime}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Staff Performance Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold text-booqit-dark flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Performance
          </h2>
          
          <div className="flex gap-2 overflow-x-auto">
            <Button 
              variant={selectedPeriod === 'today' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedPeriod('today')}
              className="whitespace-nowrap"
            >
              Today
            </Button>
            <Button 
              variant={selectedPeriod === 'week' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedPeriod('week')}
              className="whitespace-nowrap"
            >
              This Week
            </Button>
            <Button 
              variant={selectedPeriod === 'month' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedPeriod('month')}
              className="whitespace-nowrap"
            >
              This Month
            </Button>
            <Button 
              variant={selectedPeriod === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setSelectedPeriod('all')}
              className="whitespace-nowrap"
            >
              All Time
            </Button>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Staff Name</TableHead>
                    <TableHead className="text-right">Total Earnings</TableHead>
                    <TableHead className="text-right">Total Bookings</TableHead>
                    <TableHead className="text-right">Avg per Booking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredStaffData().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-booqit-dark/60">
                        No staff data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredStaffData().map((staff) => (
                      <TableRow key={staff.staff_id}>
                        <TableCell className="font-medium">{staff.staff_name}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{staff.total_earnings.toFixed(0)}
                        </TableCell>
                        <TableCell className="text-right">{staff.total_bookings}</TableCell>
                        <TableCell className="text-right">
                          ₹{staff.total_bookings > 0 ? (staff.total_earnings / staff.total_bookings).toFixed(0) : '0'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EarningsAnalyticsPage;
