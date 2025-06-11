import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, addDays, isSameDay, isToday } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Store, CalendarX, Scissors, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import CancelBookingButton from '@/components/customer/CancelBookingButton';
const CalendarPage: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const {
    toast
  } = useToast();
  const {
    userId
  } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Generate 5 days starting from today (current date + next 4 days)
  const weekDays = useMemo(() => {
    const today = new Date();
    return Array.from({
      length: 5
    }, (_, i) => addDays(today, i));
  }, []);

  // Helper function to get service names from services JSON
  const getServiceNames = (booking: Booking): string => {
    // First try to get from services JSON field
    if (booking.services) {
      try {
        const services = typeof booking.services === 'string' ? JSON.parse(booking.services) : booking.services;
        if (Array.isArray(services)) {
          return services.map(service => service.name).join(', ');
        }
      } catch (error) {
        console.error('Error parsing services JSON:', error);
      }
    }

    // Fallback to single service name
    return booking.service?.name || 'Service';
  };

  // Helper function to parse services for navigation
  const parseServicesForNavigation = (booking: Booking) => {
    if (booking.services) {
      try {
        const services = typeof booking.services === 'string' ? JSON.parse(booking.services) : booking.services;
        if (Array.isArray(services)) {
          return services;
        } else if (services && typeof services === 'object') {
          return [services];
        }
      } catch (error) {
        console.error('Error parsing services JSON:', error);
      }
    }

    // Fallback to single service
    if (booking.service) {
      return [booking.service];
    }
    return [];
  };

  // Fetch bookings with optimized caching and real-time updates
  const {
    data: bookings = [],
    isFetching: isBookingsFetching,
    refetch: refetchBookings
  } = useQuery({
    queryKey: ['customer-bookings', userId],
    queryFn: async (): Promise<Booking[]> => {
      if (!userId) return [];
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
      return data as Booking[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    // Reduce stale time to 30 seconds for more frequent updates
    gcTime: 5 * 60 * 1000 // Reduce garbage collection time to 5 minutes
  });

  // Fetch appointment counts with caching
  const {
    data: appointmentCounts = {},
    isFetching: isCountsFetching,
    refetch: refetchCounts
  } = useQuery({
    queryKey: ['appointment-counts', userId, weekDays.map(d => format(d, 'yyyy-MM-dd'))],
    queryFn: async (): Promise<{
      [date: string]: number;
    }> => {
      if (!userId || !bookings) return {};
      const counts: {
        [date: string]: number;
      } = {};
      for (const day of weekDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayBookings = bookings.filter(booking => booking.date === dateStr && booking.status !== 'cancelled');
        counts[dateStr] = dayBookings.length;
      }
      return counts;
    },
    enabled: !!userId && !!bookings,
    staleTime: 30 * 1000 // Reduce stale time for faster updates
  });

  // Enhanced real-time subscription for instant booking updates
  useEffect(() => {
    if (!userId) return;
    console.log('Customer: Setting up enhanced real-time subscription for bookings');
    const channel = supabase.channel('customer-bookings-realtime-enhanced').on('postgres_changes', {
      event: '*',
      // Listen to all events (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'bookings',
      filter: `user_id=eq.${userId}`
    }, payload => {
      console.log('Customer: Real-time booking update received:', payload);

      // Immediately invalidate and refetch both queries for instant updates
      queryClient.invalidateQueries({
        queryKey: ['customer-bookings', userId]
      });
      queryClient.invalidateQueries({
        queryKey: ['appointment-counts', userId]
      });

      // Also trigger immediate refetch for faster updates
      refetchBookings();
      refetchCounts();

      // Show toast notification for new bookings
      if (payload.eventType === 'INSERT') {
        toast({
          title: "New Booking Created",
          description: "Your booking has been confirmed!"
        });
      } else if (payload.eventType === 'UPDATE') {
        toast({
          title: "Booking Updated",
          description: "Your booking status has been updated."
        });
      }
    }).subscribe(status => {
      console.log('Customer: Enhanced real-time subscription status:', status);
    });
    return () => {
      console.log('Customer: Cleaning up enhanced real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, refetchBookings, refetchCounts, toast]);

  // Additional effect to handle bookings array changes and update counts
  useEffect(() => {
    if (bookings.length > 0) {
      // Invalidate appointment counts when bookings change
      queryClient.invalidateQueries({
        queryKey: ['appointment-counts', userId]
      });
    }
  }, [bookings, userId, queryClient]);

  // Navigate to search page
  const handleExploreServices = () => {
    navigate('/search');
  };

  // Navigate to receipt page with proper services data
  const handleViewReceipt = (booking: Booking) => {
    const services = parseServicesForNavigation(booking);
    navigate(`/receipt/${booking.id}`, {
      state: {
        booking: {
          ...booking,
          services: services
        },
        selectedServices: services,
        merchant: booking.merchant
      }
    });
  };

  // Enhanced booking refresh handler
  const handleBookingRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['customer-bookings', userId]
    });
    queryClient.invalidateQueries({
      queryKey: ['appointment-counts', userId]
    });
    refetchBookings();
    refetchCounts();
  };

  // Filter bookings for the selected date
  const todayBookings = useMemo(() => {
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      return isSameDay(bookingDate, date);
    }).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  }, [bookings, date]);

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
  const navigateToNextDay = () => {
    const currentIndex = weekDays.findIndex(day => isSameDay(day, date));
    const nextIndex = (currentIndex + 1) % weekDays.length;
    setDate(weekDays[nextIndex]);
  };
  const navigateToPrevDay = () => {
    const currentIndex = weekDays.findIndex(day => isSameDay(day, date));
    const prevIndex = currentIndex === 0 ? weekDays.length - 1 : currentIndex - 1;
    setDate(weekDays[prevIndex]);
  };
  const goToToday = () => {
    setDate(new Date());
  };
  return <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="h-6 w-6 text-booqit-primary" />
          <h1 className="text-2xl md:text-3xl font-light">Your Calendar</h1>
          {(isBookingsFetching || isCountsFetching) && <Loader2 className="h-4 w-4 animate-spin text-booqit-primary ml-2" />}
        </div>
        <p className="text-muted-foreground">Manage your appointments</p>
      </div>

      {/* Week Calendar */}
      <Card className="mb-6 overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-r from-booqit-primary/5 to-booqit-primary/10 py-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-booqit-dark font-light text-lg">Calendar</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={navigateToPrevDay} className="h-8 px-3">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 font-medium text-sm px-[28px]">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToNextDay} className="h-8 px-3">
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
          <CardTitle className="flex items-center gap-2 text-xl font-righteous ">
            <CalendarIcon className="h-5 w-5 text-booqit-primary" />
            {format(date, 'MMMM d, yyyy')} Bookings
            {isBookingsFetching && <Loader2 className="h-4 w-4 animate-spin text-booqit-primary ml-2" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {todayBookings.length === 0 ? <div className="text-center py-8 border rounded-lg bg-gray-50">
              <CalendarX className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 text-sm mb-4">No bookings for this date</p>
              <Button className="bg-booqit-primary hover:bg-booqit-primary/90" onClick={() => navigate('/search')}>
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
                          <h3 className="text-gray-900 mb-1 text-lg font-light">{getServiceNames(booking)}</h3>
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
                    
                    {booking.status !== 'cancelled' && booking.status !== 'completed' && <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewReceipt(booking)} className="h-8 text-base font-medium px-[23px] mx-[20px]">
                          Receipt
                        </Button>
                        <CancelBookingButton bookingId={booking.id} onCancelled={handleBookingRefresh} />
                      </div>}
                  </CardContent>
                </Card>)}
            </div>}
        </CardContent>
      </Card>
    </div>;
};
export default CalendarPage;