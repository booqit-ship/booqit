import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, addDays, isSameDay, startOfWeek, isToday } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Store, Check, X, CalendarX, Scissors, ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { useCancelBooking } from '@/hooks/useCancelBooking';
import CancelBookingButton from '@/components/customer/CancelBookingButton';
const CalendarPage: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), {
    weekStartsOn: 1
  }));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appointmentCounts, setAppointmentCounts] = useState<{
    [date: string]: number;
  }>({});
  const {
    toast
  } = useToast();
  const {
    userId
  } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    cancelBooking,
    isCancelling
  } = useCancelBooking();

  // Generate week days (5 weekdays only)
  const weekDays = Array.from({
    length: 5
  }, (_, i) => addDays(weekStart, i));

  // Navigate to search page
  const handleExploreServices = () => {
    navigate('/search');
  };

  // Fetch bookings for the user with stylist names
  const fetchBookings = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      console.log('Customer: Fetching bookings for user:', userId);
      const {
        data,
        error
      } = await supabase.from('bookings').select(`
          *,
          stylist_name,
          service:service_id (
            id,
            name,
            price,
            duration,
            description,
            merchant_id,
            created_at,
            image_url
          ),
          merchant:merchant_id (
            id,
            shop_name,
            address,
            image_url,
            user_id,
            description,
            category,
            gender_focus,
            lat,
            lng,
            open_time,
            close_time,
            rating,
            created_at
          )
        `).eq('user_id', userId).order('date', {
        ascending: true
      });
      if (error) throw error;
      console.log('Customer bookings fetched:', data);
      setBookings(data as Booking[]);
    } catch (error: any) {
      console.error('Error fetching customer bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your bookings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch appointment counts for the week
  useEffect(() => {
    const fetchAppointmentCounts = async () => {
      if (!userId) return;
      const counts: {
        [date: string]: number;
      } = {};
      for (const day of weekDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayBookings = bookings.filter(booking => booking.date === dateStr && booking.status !== 'cancelled');
        counts[dateStr] = dayBookings.length;
      }
      setAppointmentCounts(counts);
    };
    fetchAppointmentCounts();
  }, [userId, weekDays, bookings]);

  // Set up real-time subscription for bookings
  useEffect(() => {
    fetchBookings();
    if (!userId) return;

    // Set up real-time subscription for bookings changes
    const channel = supabase.channel('customer-bookings-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `user_id=eq.${userId}`
    }, payload => {
      console.log('Real-time booking update received by customer:', payload);
      // Immediately fetch fresh data when any change occurs
      fetchBookings();
    }).subscribe(status => {
      console.log('Customer real-time subscription status:', status);
    });
    return () => {
      console.log('Cleaning up customer real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Filter bookings for the selected date
  const todayBookings = useMemo(() => {
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      return isSameDay(bookingDate, date);
    }).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  }, [bookings, date]);

  // Handle booking cancellation with proper function
  const handleCancelBooking = async (bookingId: string) => {
    console.log('Customer cancelling booking via direct function:', bookingId);
    const success = await cancelBooking(bookingId, userId);
    if (success) {
      // Refresh bookings immediately
      await fetchBookings();
      toast({
        title: "Success",
        description: "Booking has been cancelled and slots have been released."
      });
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = addDays(weekStart, direction === 'next' ? 5 : -5);
    setWeekStart(newWeekStart);
    if (!weekDays.some(day => isSameDay(day, date))) {
      setDate(newWeekStart);
    }
  };
  const goToToday = () => {
    const today = new Date();
    setDate(today);
    setWeekStart(startOfWeek(today, {
      weekStartsOn: 1
    }));
  };
  return <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="h-6 w-6 text-booqit-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Your Calendar</h1>
        </div>
        <p className="text-muted-foreground">Manage your appointments</p>
      </div>

      {/* Week Calendar */}
      <Card className="mb-6 overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-r from-booqit-primary/5 to-booqit-primary/10 py-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-booqit-dark text-base font-semibold">Calendar</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="h-8 px-3">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium px-3" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="h-8 px-3">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-2">
            {weekDays.map((day, index) => {
            const isCurrentDay = isToday(day);
            const isSelectedDay = isSameDay(day, date);
            const dateKey = format(day, 'yyyy-MM-dd');
            const appointmentCount = appointmentCounts[dateKey] || 0;
            return <div key={index} className="flex flex-col items-center cursor-pointer" onClick={() => setDate(day)}>
                  <div className={`
                    w-full h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-200
                    ${isSelectedDay ? 'bg-booqit-primary text-white shadow-lg border-2 border-booqit-primary' : isCurrentDay ? 'bg-booqit-primary/20 text-booqit-primary border-2 border-booqit-primary/30' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'}
                  `}>
                    <div className="text-xs font-medium uppercase tracking-wide">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-lg font-bold">
                      {format(day, 'd')}
                    </div>
                    <div className="text-xs">
                      {format(day, 'MMM')}
                    </div>
                  </div>
                  
                  
                </div>;
          })}
          </div>
        </CardContent>
      </Card>
      
      {/* Today's Bookings */}
      <Card className="mb-6">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-booqit-primary" />
            {format(date, 'MMMM d, yyyy')} Bookings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
            </div> : todayBookings.length === 0 ? <div className="text-center py-8 border rounded-lg bg-gray-50">
              <CalendarX className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 text-sm mb-4">No bookings for this date</p>
              <Button className="bg-booqit-primary hover:bg-booqit-primary/90" onClick={handleExploreServices}>
                Book an Appointment
              </Button>
            </div> : <div className="space-y-4">
              {todayBookings.map(booking => <Card key={booking.id} className="border-l-4 border-l-booqit-primary shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-booqit-primary/10 p-2 rounded-full">
                          <Clock className="h-4 w-4 text-booqit-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{booking.service?.name}</h3>
                          <p className="text-sm text-booqit-primary font-medium">
                            {formatTimeToAmPm(booking.time_slot)}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(booking.status)} text-white border-0`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Store className="h-4 w-4" />
                        <span>{booking.merchant?.shop_name}</span>
                      </div>
                      
                      {booking.stylist_name && <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Scissors className="h-4 w-4" />
                          <span>Stylist: {booking.stylist_name}</span>
                        </div>}
                    </div>
                    
                    {booking.status !== 'cancelled' && booking.status !== 'completed' && <div className="flex justify-end">
                        <CancelBookingButton bookingId={booking.id} bookingDate={booking.date} bookingTime={booking.time_slot} bookingStatus={booking.status} userId={userId} onCancelSuccess={() => fetchBookings()} className="h-8 text-sm px-4" />
                      </div>}
                  </CardContent>
                </Card>)}
            </div>}
        </CardContent>
      </Card>
      
      
    </div>;
};
export default CalendarPage;