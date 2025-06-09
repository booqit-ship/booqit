
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ArrowLeft, TrendingUp, Calendar as CalendarIcon, Users, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
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

  // Add states to track if custom data should be fetched
  const [shouldFetchEarningsData, setShouldFetchEarningsData] = useState(false);
  const [shouldFetchBookingsData, setShouldFetchBookingsData] = useState(false);
  const [shouldFetchStaffData, setShouldFetchStaffData] = useState(false);

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

  // Initial data fetch (without custom ranges)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!userId) {
        console.error('No userId available');
        toast.error('Please log in to continue');
        navigate('/auth');
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 Fetching merchant for analytics, userId:', userId);

        // Get merchant ID with retries
        const fetchMerchantId = async () => {
          const { data: merchantData, error: merchantError } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (merchantError) {
            console.error('Error fetching merchant ID:', merchantError);
            if (merchantError.code === 'PGRST116') {
              toast.error('Merchant profile not found. Please complete onboarding.');
              navigate('/merchant/onboarding');
              return null;
            }
            throw merchantError;
          }

          return merchantData;
        };

        const merchantData = await retryWithBackoff(fetchMerchantId);
        if (!merchantData) return;

        const mId = merchantData.id;
        setMerchantId(mId);
        console.log('✅ Merchant ID found for analytics:', mId);

        // Date calculations
        const today = new Date().toISOString().split('T')[0];
        const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

        // Fetch all completed bookings with service data using left join
        const fetchCompletedBookings = async () => {
          const { data: completedBookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              id,
              date,
              service_id,
              staff_id,
              services!left(price)
            `)
            .eq('merchant_id', mId)
            .eq('payment_status', 'completed');

          if (bookingsError) {
            console.error('Error fetching bookings:', bookingsError);
            throw bookingsError;
          }

          return completedBookings || [];
        };

        const completedBookings = await retryWithBackoff(fetchCompletedBookings);
        console.log('📊 Completed bookings loaded:', completedBookings.length);

        if (completedBookings) {
          // Calculate earnings (without custom range) - handle missing prices
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
            customRange: 0,
          });

          console.log('💰 Earnings calculated:', { totalEarnings, todayEarnings, weekEarnings, monthEarnings });

          // Calculate bookings counts (without custom range)
          const totalBookingsCount = completedBookings.length;
          const todayBookingsCount = completedBookings.filter(b => b.date === today).length;
          const weekBookingsCount = completedBookings.filter(b => b.date >= weekStart && b.date <= weekEnd).length;
          const monthBookingsCount = completedBookings.filter(b => b.date >= monthStart && b.date <= monthEnd).length;

          setBookings({
            total: totalBookingsCount,
            today: todayBookingsCount,
            thisWeek: weekBookingsCount,
            thisMonth: monthBookingsCount,
            customRange: 0,
          });

          console.log('📋 Bookings calculated:', { totalBookingsCount, todayBookingsCount, weekBookingsCount, monthBookingsCount });
        }

        // Fetch staff data (without custom range initially)
        const fetchStaffData = async () => {
          const { data: staffList, error: staffError } = await supabase
            .from('staff')
            .select('id, name')
            .eq('merchant_id', mId);

          if (staffError) {
            console.error('Error fetching staff:', staffError);
            throw staffError;
          }

          return staffList || [];
        };

        const staffList = await retryWithBackoff(fetchStaffData);
        console.log('👥 Staff list loaded:', staffList.length);

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
          console.log('👥 Staff earnings calculated:', staffEarningsData);
        }

      } catch (error) {
        console.error('❌ Error fetching analytics data:', error);
        setError('Failed to load analytics data');
        toast.error('Failed to load analytics data');
        
        // Set fallback values
        setEarnings({
          total: 0,
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          customRange: 0,
        });
        setBookings({
          total: 0,
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          customRange: 0,
        });
        setStaffData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [userId]);

  // Separate effect for custom range data fetching
  useEffect(() => {
    const fetchCustomRangeData = async () => {
      if (!merchantId) return;

      try {
        // Fetch earnings custom range
        if (shouldFetchEarningsData && earningsDateRange.from && earningsDateRange.to) {
          const fromDate = format(earningsDateRange.from, 'yyyy-MM-dd');
          const toDate = format(earningsDateRange.to, 'yyyy-MM-dd');
          
          console.log('💰 Fetching custom earnings range:', fromDate, 'to', toDate);
          
          const fetchCustomEarnings = async () => {
            const { data: earningsBookings, error } = await supabase
              .from('bookings')
              .select(`services!left(price)`)
              .eq('merchant_id', merchantId)
              .eq('payment_status', 'completed')
              .gte('date', fromDate)
              .lte('date', toDate);

            if (error) {
              console.error('Error fetching custom earnings:', error);
              throw error;
            }

            return earningsBookings || [];
          };

          const earningsBookings = await retryWithBackoff(fetchCustomEarnings);
          
          if (earningsBookings) {
            const customEarnings = earningsBookings.reduce((sum, booking) => 
              sum + (booking.services?.price || 0), 0
            );
            setEarnings(prev => ({ ...prev, customRange: customEarnings }));
            console.log('💰 Custom earnings calculated:', customEarnings);
          }
          setShouldFetchEarningsData(false);
        }

        // Fetch bookings custom range
        if (shouldFetchBookingsData && bookingsDateRange.from && bookingsDateRange.to) {
          const fromDate = format(bookingsDateRange.from, 'yyyy-MM-dd');
          const toDate = format(bookingsDateRange.to, 'yyyy-MM-dd');
          
          console.log('📋 Fetching custom bookings range:', fromDate, 'to', toDate);
          
          const fetchCustomBookings = async () => {
            const { data: bookingsData, error } = await supabase
              .from('bookings')
              .select('id')
              .eq('merchant_id', merchantId)
              .eq('payment_status', 'completed')
              .gte('date', fromDate)
              .lte('date', toDate);

            if (error) {
              console.error('Error fetching custom bookings:', error);
              throw error;
            }

            return bookingsData || [];
          };

          const bookingsData = await retryWithBackoff(fetchCustomBookings);
          
          if (bookingsData) {
            setBookings(prev => ({ ...prev, customRange: bookingsData.length }));
            console.log('📋 Custom bookings calculated:', bookingsData.length);
          }
          setShouldFetchBookingsData(false);
        }

        // Fetch staff custom range
        if (shouldFetchStaffData && staffDateRange.from && staffDateRange.to) {
          const fromDate = format(staffDateRange.from, 'yyyy-MM-dd');
          const toDate = format(staffDateRange.to, 'yyyy-MM-dd');
          
          console.log('👥 Fetching custom staff range:', fromDate, 'to', toDate);
          
          const fetchCustomStaffData = async () => {
            const { data: staffList, error: staffError } = await supabase
              .from('staff')
              .select('id, name')
              .eq('merchant_id', merchantId);

            if (staffError) {
              console.error('Error fetching staff list:', staffError);
              throw staffError;
            }

            const { data: staffBookings, error: bookingsError } = await supabase
              .from('bookings')
              .select(`
                staff_id,
                services!left(price)
              `)
              .eq('merchant_id', merchantId)
              .eq('payment_status', 'completed')
              .gte('date', fromDate)
              .lte('date', toDate);

            if (bookingsError) {
              console.error('Error fetching staff bookings:', bookingsError);
              throw bookingsError;
            }

            return { staffList: staffList || [], staffBookings: staffBookings || [] };
          };

          const { staffList, staffBookings } = await retryWithBackoff(fetchCustomStaffData);
          
          if (staffList && staffBookings) {
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

            setStaffData(staffEarningsData);
            console.log('👥 Custom staff earnings calculated:', staffEarningsData);
          }
          setShouldFetchStaffData(false);
        }

      } catch (error) {
        console.error('❌ Error fetching custom range data:', error);
        toast.error('Failed to load custom date range data');
        
        // Set fallback values
        if (shouldFetchEarningsData) {
          setEarnings(prev => ({ ...prev, customRange: 0 }));
          setShouldFetchEarningsData(false);
        }
        if (shouldFetchBookingsData) {
          setBookings(prev => ({ ...prev, customRange: 0 }));
          setShouldFetchBookingsData(false);
        }
        if (shouldFetchStaffData) {
          setStaffData([]);
          setShouldFetchStaffData(false);
        }
      }
    };

    fetchCustomRangeData();
  }, [shouldFetchEarningsData, shouldFetchBookingsData, shouldFetchStaffData, merchantId, earningsDateRange, bookingsDateRange, staffDateRange]);

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
        // Don't close popover - let user complete selection or click Done
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
      // Don't close popover when changing months
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

  // Error state UI
  if (error && !isLoading) {
    return (
      <div className="p-4 md:p-6 pb-20">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/merchant')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Unable to load analytics data</h3>
            <p className="text-red-600 mb-4">Please refresh the page or contact support if the problem persists.</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="border-red-300 text-red-700">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            onDone={() => setShouldFetchEarningsData(true)}
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
            onDone={() => setShouldFetchBookingsData(true)}
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
            onDone={() => setShouldFetchStaffData(true)}
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
              <div className="text-center py-8">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No staff data available</p>
                <p className="text-gray-400 text-sm mt-1">Staff performance will appear here when data is available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
