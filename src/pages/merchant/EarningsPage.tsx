import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, TrendingUp, Calendar, CircleDollarSign, BookOpen } from 'lucide-react';

interface EarningStats {
  today: number;
  yesterday: number;
  thisWeek: number;
  thisMonth: number;
  total: number;
  bookingsCount: {
    total: number;
    completed: number;
    cancelled: number;
  };
  chartData: {
    date: string;
    earnings: number;
  }[];
}

const EarningsPage: React.FC = () => {
  const [stats, setStats] = useState<EarningStats>({
    today: 0,
    yesterday: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    bookingsCount: {
      total: 0,
      completed: 0,
      cancelled: 0
    },
    chartData: []
  });
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartView, setChartView] = useState<'week' | 'month'>('week');
  const { toast } = useToast();
  const { userId } = useAuth();

  // Fetch merchant ID for the current user
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

  // Fetch earnings data
  useEffect(() => {
    const fetchEarningsData = async () => {
      if (!merchantId) return;
      
      setIsLoading(true);
      try {
        const today = new Date();
        const yesterday = subDays(today, 1);
        const weekStart = startOfWeek(today);
        const weekEnd = endOfWeek(today);
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        
        // Format dates for comparison
        const todayStr = format(today, 'yyyy-MM-dd');
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
        
        // Fetch all bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, date, status, payment_status')
          .eq('merchant_id', merchantId);
          
        if (bookingsError) throw bookingsError;
        
        // Calculate earnings using the new structure
        let todayEarnings = 0;
        let yesterdayEarnings = 0;
        let weekEarnings = 0;
        let monthEarnings = 0;
        let totalEarnings = 0;
        
        let totalBookings = bookingsData.length;
        let completedBookings = 0;
        let cancelledBookings = 0;
        
        // Map of date to earnings for chart data
        const dateEarnings = new Map<string, number>();
        
        // Process each booking to calculate earnings
        for (const booking of bookingsData) {
          const bookingDate = new Date(booking.date);
          const dateStr = booking.date;
          
          // Count booking status for statistics
          if (booking.status === 'completed') {
            completedBookings++;
          } else if (booking.status === 'cancelled') {
            cancelledBookings++;
          }
          
          // Only count earnings from completed bookings with completed payment status
          if (booking.status === 'completed' && booking.payment_status === 'completed') {
            // Get services for this booking to calculate total price
            const { data: servicesData, error: servicesError } = await supabase
              .rpc('get_booking_services', { p_booking_id: booking.id });
            
            if (!servicesError && servicesData) {
              const amount = servicesData.reduce((sum: number, service: any) => 
                sum + (service.service_price || 0), 0);
              
              totalEarnings += amount;
              
              // Check date ranges
              if (dateStr === todayStr) {
                todayEarnings += amount;
              }
              
              if (dateStr === yesterdayStr) {
                yesterdayEarnings += amount;
              }
              
              if (bookingDate >= weekStart && bookingDate <= weekEnd) {
                weekEarnings += amount;
              }
              
              if (bookingDate >= monthStart && bookingDate <= monthEnd) {
                monthEarnings += amount;
              }
              
              // Add to chart data map
              dateEarnings.set(dateStr, (dateEarnings.get(dateStr) || 0) + amount);
            }
          }
        }
        
        // Create chart data array
        let chartData = [];
        
        if (chartView === 'week') {
          // Get last 7 days
          for (let i = 6; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            chartData.push({
              date: format(date, 'MMM dd'),
              earnings: dateEarnings.get(dateStr) || 0
            });
          }
        } else {
          // Get data for this month
          for (let i = 0; i < monthEnd.getDate(); i++) {
            const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
            if (date > today) break;
            
            const dateStr = format(date, 'yyyy-MM-dd');
            chartData.push({
              date: format(date, 'MMM dd'),
              earnings: dateEarnings.get(dateStr) || 0
            });
          }
        }
        
        setStats({
          today: todayEarnings,
          yesterday: yesterdayEarnings,
          thisWeek: weekEarnings,
          thisMonth: monthEarnings,
          total: totalEarnings,
          bookingsCount: {
            total: totalBookings,
            completed: completedBookings,
            cancelled: cancelledBookings
          },
          chartData
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch earnings data. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEarningsData();
  }, [merchantId, chartView]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Earnings</h1>
        <p className="text-booqit-dark/70">Track your business performance and revenue</p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-booqit-dark/60 text-sm">Today</p>
                    <h3 className="text-2xl font-bold mt-1">₹{stats.today.toFixed(2)}</h3>
                  </div>
                  <div className="bg-booqit-primary/10 p-2 rounded-full">
                    <Wallet className="h-6 w-6 text-booqit-primary" />
                  </div>
                </div>
                <p className={`text-xs mt-2 ${stats.today > stats.yesterday ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.yesterday > 0 
                    ? stats.today > stats.yesterday
                      ? `+${((stats.today - stats.yesterday) / stats.yesterday * 100).toFixed(0)}% from yesterday`
                      : `-${((stats.yesterday - stats.today) / stats.yesterday * 100).toFixed(0)}% from yesterday`
                    : 'No earnings yesterday'
                  }
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-booqit-dark/60 text-sm">This Week</p>
                    <h3 className="text-2xl font-bold mt-1">₹{stats.thisWeek.toFixed(2)}</h3>
                  </div>
                  <div className="bg-green-100 p-2 rounded-full">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs mt-2 text-booqit-dark/60">
                  Updated {format(new Date(), 'MMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-booqit-dark/60 text-sm">This Month</p>
                    <h3 className="text-2xl font-bold mt-1">₹{stats.thisMonth.toFixed(2)}</h3>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs mt-2 text-booqit-dark/60">
                  {format(startOfMonth(new Date()), 'MMM dd')} - {format(new Date(), 'MMM dd')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-booqit-dark/60 text-sm">Total Earnings</p>
                    <h3 className="text-2xl font-bold mt-1">₹{stats.total.toFixed(2)}</h3>
                  </div>
                  <div className="bg-purple-100 p-2 rounded-full">
                    <CircleDollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-xs mt-2 text-booqit-dark/60">
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Earnings Overview</CardTitle>
                    <Tabs 
                      value={chartView} 
                      onValueChange={(v) => setChartView(v as 'week' | 'month')}
                      className="w-[200px]"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="month">Month</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={stats.chartData}
                        margin={{
                          top: 10,
                          right: 30,
                          left: 0,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₹${value}`, 'Earnings']} />
                        <Area 
                          type="monotone" 
                          dataKey="earnings" 
                          stroke="#7E57C2" 
                          fill="#7E57C2" 
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Booking Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="p-4 border rounded-md">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          <div className="bg-blue-100 p-2 rounded-full mr-3">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          </div>
                          <p className="text-sm font-medium">Total Bookings</p>
                        </div>
                        <span className="text-xl font-bold">{stats.bookingsCount.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <p className="text-xs text-booqit-dark/60 mb-1">Completed</p>
                          <div className="flex items-center">
                            <span className="text-sm font-medium">{stats.bookingsCount.completed}</span>
                            <span className="ml-1 text-xs text-green-500">
                              ({stats.bookingsCount.total > 0 
                                ? ((stats.bookingsCount.completed / stats.bookingsCount.total) * 100).toFixed(0) 
                                : 0}%)
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-booqit-dark/60 mb-1">Cancelled</p>
                          <div className="flex items-center">
                            <span className="text-sm font-medium">{stats.bookingsCount.cancelled}</span>
                            <span className="ml-1 text-xs text-red-500">
                              ({stats.bookingsCount.total > 0 
                                ? ((stats.bookingsCount.cancelled / stats.bookingsCount.total) * 100).toFixed(0) 
                                : 0}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Average Earnings</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded-md text-center">
                          <p className="text-xs text-booqit-dark/60">Per Booking</p>
                          <p className="text-lg font-semibold mt-1">
                            ₹{stats.bookingsCount.completed > 0 
                              ? (stats.total / stats.bookingsCount.completed).toFixed(0) 
                              : '0'}
                          </p>
                        </div>
                        <div className="p-3 border rounded-md text-center">
                          <p className="text-xs text-booqit-dark/60">Per Day</p>
                          <p className="text-lg font-semibold mt-1">
                            ₹{(stats.thisMonth / (new Date().getDate())).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EarningsPage;
