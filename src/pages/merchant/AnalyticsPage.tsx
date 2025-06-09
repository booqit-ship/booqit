import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ArrowLeft, TrendingUp, Calendar as CalendarIcon, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface EarningsData {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  customRange: number;
}

interface BookingsData {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  customRange: number;
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
    customRange: 0,
  });
  const [bookings, setBookings] = useState<BookingsData>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    customRange: 0,
  });
  const [staffData, setStaffData] = useState<StaffEarnings[]>([]);

  // Date range states
  const [earningsDateRange, setEarningsDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const [bookingsDateRange, setBookingsDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const [staffDateRange, setStaffDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  // Calendar month states
  const [earningsCalendarMonth, setEarningsCalendarMonth] = useState(new Date());
  const [bookingsCalendarMonth, setBookingsCalendarMonth] = useState(new Date());
  const [staffCalendarMonth, setStaffCalendarMonth] = useState(new Date());

  // Popover open states
  const [earningsPopoverOpen, setEarningsPopoverOpen] = useState(false);
  const [bookingsPopoverOpen, setBookingsPopoverOpen] = useState(false);
  const [staffPopoverOpen, setStaffPopoverOpen] = useState(false);

  // Initial data fetch
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
          toast.error('Failed to load merchant data');
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

        console.log('🔍 Analytics Data Fetch:', { mId, today, weekStart, weekEnd, monthStart, monthEnd });

        // Fetch earnings data using raw SQL for accuracy
        const { data: earningsData, error: earningsError } = await supabase
          .rpc('get_merchant_earnings', {
            p_merchant_id: mId,
            p_today: today,
            p_week_start: weekStart,
            p_week_end: weekEnd,
            p_month_start: monthStart,
            p_month_end: monthEnd
          });

        if (earningsError) {
          console.error('❌ Error fetching earnings:', earningsError);
          // Fallback to manual calculation
          await fetchEarningsManually(mId, today, weekStart, weekEnd, monthStart, monthEnd);
        } else if (earningsData && earningsData.length > 0) {
          const earnings = earningsData[0];
          console.log('✅ Earnings data received:', earnings);
          setEarnings({
            total: earnings.total_earnings || 0,
            today: earnings.today_earnings || 0,
            thisWeek: earnings.week_earnings || 0,
            thisMonth: earnings.month_earnings || 0,
            customRange: 0,
          });
        } else {
          // Fallback to manual calculation
          await fetchEarningsManually(mId, today, weekStart, weekEnd, monthStart, monthEnd);
        }

        // Fetch bookings data
        const { data: bookingsData, error: bookingsError } = await supabase
          .rpc('get_merchant_bookings_count', {
            p_merchant_id: mId,
            p_today: today,
            p_week_start: weekStart,
            p_week_end: weekEnd,
            p_month_start: monthStart,
            p_month_end: monthEnd
          });

        if (bookingsError) {
          console.error('❌ Error fetching bookings count:', bookingsError);
          // Fallback to manual calculation
          await fetchBookingsManually(mId, today, weekStart, weekEnd, monthStart, monthEnd);
        } else if (bookingsData && bookingsData.length > 0) {
          const bookings = bookingsData[0];
          console.log('✅ Bookings data received:', bookings);
          setBookings({
            total: bookings.total_bookings || 0,
            today: bookings.today_bookings || 0,
            thisWeek: bookings.week_bookings || 0,
            thisMonth: bookings.month_bookings || 0,
            customRange: 0,
          });
        } else {
          // Fallback to manual calculation
          await fetchBookingsManually(mId, today, weekStart, weekEnd, monthStart, monthEnd);
        }

        // Fetch staff performance data
        const { data: staffPerformanceData, error: staffError } = await supabase
          .rpc('get_staff_performance', {
            p_merchant_id: mId
          });

        if (staffError) {
          console.error('❌ Error fetching staff performance:', staffError);
          // Fallback to manual calculation
          await fetchStaffPerformanceManually(mId);
        } else if (staffPerformanceData) {
          console.log('✅ Staff performance data received:', staffPerformanceData);
          setStaffData(staffPerformanceData.map((staff: any) => ({
            id: staff.staff_id,
            name: staff.staff_name,
            earnings: staff.total_earnings || 0,
            bookings: staff.total_bookings || 0,
          })));
        } else {
          // Fallback to manual calculation
          await fetchStaffPerformanceManually(mId);
        }

      } catch (error) {
        console.error('❌ Error fetching analytics data:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [userId]);

  // Fallback manual earnings calculation
  const fetchEarningsManually = async (mId: string, today: string, weekStart: string, weekEnd: string, monthStart: string, monthEnd: string) => {
    try {
      console.log('🔄 Fetching earnings manually...');
      
      const { data: completedBookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          date,
          payment_status,
          services!inner(price)
        `)
        .eq('merchant_id', mId)
        .eq('status', 'completed')
        .eq('payment_status', 'completed');

      if (error) {
        console.error('❌ Manual earnings fetch error:', error);
        return;
      }

      console.log('📊 Manual earnings - completed bookings:', completedBookings);

      if (completedBookings && completedBookings.length > 0) {
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

        console.log('💰 Manual earnings calculated:', { totalEarnings, todayEarnings, weekEarnings, monthEarnings });

        setEarnings({
          total: totalEarnings,
          today: todayEarnings,
          thisWeek: weekEarnings,
          thisMonth: monthEarnings,
          customRange: 0,
        });
      }
    } catch (error) {
      console.error('❌ Manual earnings calculation error:', error);
    }
  };

  // Fallback manual bookings calculation
  const fetchBookingsManually = async (mId: string, today: string, weekStart: string, weekEnd: string, monthStart: string, monthEnd: string) => {
    try {
      console.log('🔄 Fetching bookings manually...');
      
      const { data: allBookings, error } = await supabase
        .from('bookings')
        .select('id, date, status')
        .eq('merchant_id', mId)
        .neq('status', 'cancelled');

      if (error) {
        console.error('❌ Manual bookings fetch error:', error);
        return;
      }

      console.log('📊 Manual bookings - all bookings:', allBookings);

      if (allBookings) {
        const totalBookingsCount = allBookings.length;
        const todayBookingsCount = allBookings.filter(b => b.date === today).length;
        const weekBookingsCount = allBookings.filter(b => b.date >= weekStart && b.date <= weekEnd).length;
        const monthBookingsCount = allBookings.filter(b => b.date >= monthStart && b.date <= monthEnd).length;

        console.log('📈 Manual bookings calculated:', { totalBookingsCount, todayBookingsCount, weekBookingsCount, monthBookingsCount });

        setBookings({
          total: totalBookingsCount,
          today: todayBookingsCount,
          thisWeek: weekBookingsCount,
          thisMonth: monthBookingsCount,
          customRange: 0,
        });
      }
    } catch (error) {
      console.error('❌ Manual bookings calculation error:', error);
    }
  };

  // Fallback manual staff performance calculation
  const fetchStaffPerformanceManually = async (mId: string) => {
    try {
      console.log('🔄 Fetching staff performance manually...');
      
      const { data: staffList, error: staffError } = await supabase
        .from('staff')
        .select('id, name')
        .eq('merchant_id', mId);

      if (staffError) {
        console.error('❌ Staff list fetch error:', staffError);
        return;
      }

      const { data: staffBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          staff_id,
          services!inner(price)
        `)
        .eq('merchant_id', mId)
        .eq('status', 'completed')
        .eq('payment_status', 'completed');

      if (bookingsError) {
        console.error('❌ Staff bookings fetch error:', bookingsError);
        return;
      }

      console.log('👥 Manual staff performance - staff list:', staffList);
      console.log('👥 Manual staff performance - staff bookings:', staffBookings);

      if (staffList && staffBookings) {
        const staffEarningsData = staffList.map(staff => {
          const staffCompletedBookings = staffBookings.filter(b => b.staff_id === staff.id);
          const staffEarnings = staffCompletedBookings.reduce((sum, booking) => 
            sum + (booking.services?.price || 0), 0
          );
          
          return {
            id: staff.id,
            name: staff.name,
            earnings: staffEarnings,
            bookings: staffCompletedBookings.length,
          };
        });

        console.log('💼 Manual staff performance calculated:', staffEarningsData);
        setStaffData(staffEarningsData);
      }
    } catch (error) {
      console.error('❌ Manual staff performance calculation error:', error);
    }
  };

  // Function to fetch custom range data
  const fetchCustomRangeData = async (type: 'earnings' | 'bookings' | 'staff', dateRange: DateRange) => {
    if (!merchantId || !dateRange.from || !dateRange.to) return;

    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      console.log(`📅 Fetching custom range data for ${type}:`, { fromDate, toDate });

      if (type === 'earnings') {
        const { data: earningsBookings, error } = await supabase
          .from('bookings')
          .select(`
            id,
            services!inner(price)
          `)
          .eq('merchant_id', merchantId)
          .eq('status', 'completed')
          .eq('payment_status', 'completed')
          .gte('date', fromDate)
          .lte('date', toDate);

        if (!error && earningsBookings) {
          const customEarnings = earningsBookings.reduce((sum, booking) => 
            sum + (booking.services?.price || 0), 0
          );
          console.log('💰 Custom range earnings:', customEarnings);
          setEarnings(prev => ({ ...prev, customRange: customEarnings }));
        }
      } else if (type === 'bookings') {
        const { data: bookingsData, error } = await supabase
          .from('bookings')
          .select('id')
          .eq('merchant_id', merchantId)
          .neq('status', 'cancelled')
          .gte('date', fromDate)
          .lte('date', toDate);

        if (!error && bookingsData) {
          console.log('📈 Custom range bookings count:', bookingsData.length);
          setBookings(prev => ({ ...prev, customRange: bookingsData.length }));
        }
      } else if (type === 'staff') {
        const { data: staffList, error: staffError } = await supabase
          .from('staff')
          .select('id, name')
          .eq('merchant_id', merchantId);

        const { data: staffBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            staff_id,
            services!inner(price)
          `)
          .eq('merchant_id', merchantId)
          .eq('status', 'completed')
          .eq('payment_status', 'completed')
          .gte('date', fromDate)
          .lte('date', toDate);

        if (!staffError && !bookingsError && staffList && staffBookings) {
          const staffEarningsData = staffList.map(staff => {
            const staffBookingsFiltered = staffBookings.filter(b => b.staff_id === staff.id);
            const staffEarnings = staffBookingsFiltered.reduce((sum, booking) => 
              sum + (booking.services?.price || 0), 0
            );
            
            return {
              id: staff.id,
              name: staff.name,
              earnings: staffEarnings,
              bookings: staffBookingsFiltered.length,
            };
          });

          console.log('👥 Custom range staff performance:', staffEarningsData);
          setStaffData(staffEarningsData);
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching custom range data for ${type}:`, error);
    }
  };

  // DateRangePicker component
  const DateRangePicker = ({ 
    dateRange, 
    setDateRange, 
    label,
    calendarMonth,
    setCalendarMonth,
    popoverOpen,
    setPopoverOpen,
    onDone
  }: {
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    label: string;
    calendarMonth: Date;
    setCalendarMonth: (date: Date) => void;
    popoverOpen: boolean;
    setPopoverOpen: (open: boolean) => void;
    onDone: () => void;
  }) => {
    
    const handleDateSelect = (range: DateRange | undefined) => {
      if (range) {
        setDateRange(range);
      }
    };

    const handleClear = () => {
      setDateRange({ from: undefined, to: undefined });
      setPopoverOpen(false);
    };

    const handleDone = () => {
      if (dateRange.from && dateRange.to) {
        onDone();
        setPopoverOpen(false);
      }
    };

    const handleMonthChange = (newMonth: Date) => {
      setCalendarMonth(newMonth);
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCalendarMonth(subMonths(calendarMonth, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCalendarMonth(addMonths(calendarMonth, 1));
    };

    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                  {format(dateRange.to, "MMM dd, yyyy")}
                </>
              ) : (
                format(dateRange.from, "MMM dd, yyyy")
              )
            ) : (
              <span>Pick {label} date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" onInteractOutside={(e) => e.preventDefault()}>
          <div className="p-3" onClick={(e) => e.stopPropagation()}>
            {/* Month Navigation Header */}
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevMonth}
                className="h-8 w-8 p-0"
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-medium">
                {format(calendarMonth, "MMMM yyyy")}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                className="h-8 w-8 p-0"
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Calendar */}
            <Calendar
              mode="range"
              defaultMonth={calendarMonth}
              month={calendarMonth}
              onMonthChange={handleMonthChange}
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={1}
              className="pointer-events-auto"
              classNames={{
                nav_button_previous: "hidden",
                nav_button_next: "hidden",
                caption: "hidden",
              }}
            />

            {/* Action Buttons */}
            <div className="flex justify-between mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex items-center gap-2"
                type="button"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
              {dateRange.from && dateRange.to && (
                <Button
                  size="sm"
                  onClick={handleDone}
                  type="button"
                >
                  Done
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

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

        {/* Custom Date Range for Earnings */}
        <div className="mb-4">
          <DateRangePicker 
            dateRange={earningsDateRange}
            setDateRange={setEarningsDateRange}
            label="earnings"
            calendarMonth={earningsCalendarMonth}
            setCalendarMonth={setEarningsCalendarMonth}
            popoverOpen={earningsPopoverOpen}
            setPopoverOpen={setEarningsPopoverOpen}
            onDone={() => fetchCustomRangeData('earnings', earningsDateRange)}
          />
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

          {earningsDateRange.from && earningsDateRange.to && (
            <Card className="col-span-2">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Custom Range</p>
                <p className="text-xl font-semibold text-blue-600">₹{earnings.customRange}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bookings Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
          <h2 className="text-xl font-semibold">Bookings</h2>
        </div>

        {/* Custom Date Range for Bookings */}
        <div className="mb-4">
          <DateRangePicker 
            dateRange={bookingsDateRange}
            setDateRange={setBookingsDateRange}
            label="bookings"
            calendarMonth={bookingsCalendarMonth}
            setCalendarMonth={setBookingsCalendarMonth}
            popoverOpen={bookingsPopoverOpen}
            setPopoverOpen={setBookingsPopoverOpen}
            onDone={() => fetchCustomRangeData('bookings', bookingsDateRange)}
          />
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

          {bookingsDateRange.from && bookingsDateRange.to && (
            <Card className="col-span-2">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Custom Range</p>
                <p className="text-xl font-semibold text-blue-600">{bookings.customRange}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Staff Performance */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 mr-2 text-purple-600" />
          <h2 className="text-xl font-semibold">Staff Performance</h2>
        </div>

        {/* Custom Date Range for Staff */}
        <div className="mb-4">
          <DateRangePicker 
            dateRange={staffDateRange}
            setDateRange={setStaffDateRange}
            label="staff performance"
            calendarMonth={staffCalendarMonth}
            setCalendarMonth={setStaffCalendarMonth}
            popoverOpen={staffPopoverOpen}
            setPopoverOpen={setStaffPopoverOpen}
            onDone={() => fetchCustomRangeData('staff', staffDateRange)}
          />
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
