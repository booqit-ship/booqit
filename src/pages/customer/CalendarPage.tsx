
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, addDays, isSameDay } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  Store,
  Check,
  X,
  CalendarX
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const CalendarPage: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userId } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Calculate the visible days based on the selected date (today + next 6 days)
  const visibleDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);

  // Navigate to search page
  const handleExploreServices = () => {
    navigate('/search');
  };

  // Fetch bookings for the user with real-time updates
  useEffect(() => {
    const fetchBookings = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
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
          `)
          .eq('user_id', userId)
          .order('date', { ascending: true });
          
        if (error) throw error;
        
        setBookings(data as Booking[]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch your bookings. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookings();

    // Set up real-time subscription for bookings
    const channel = supabase
      .channel('customer-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Real-time booking update received:', payload);
          fetchBookings(); // Refetch bookings when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  // Filter bookings for the selected date
  const todayBookings = useMemo(() => {
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      return isSameDay(bookingDate, date);
    }).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  }, [bookings, date]);

  // Handle booking cancellation
  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Booking has been cancelled.",
      });

      // Booking update will be received via real-time subscription
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Go to today
  const goToToday = () => setDate(new Date());

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-booqit-dark">Your Calendar</h1>
      </div>
      
      {/* Compact Calendar View with improved mobile layout and touch targets */}
      <Card className="mb-4 overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-r from-booqit-primary/5 to-booqit-primary/10 py-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-booqit-dark text-base sm:text-lg">Your Appointments</CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium px-2"
                onClick={goToToday}
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="flex w-full">
            {visibleDays.map((day, index) => {
              const isCurrentDay = isSameDay(day, new Date());
              const isSelectedDay = isSameDay(day, date);
              
              return (
                <div 
                  key={index}
                  onClick={() => setDate(day)}
                  className={`
                    flex-1 transition-all cursor-pointer border-r last:border-r-0 border-gray-100
                    ${isSelectedDay ? 'bg-purple-100 ring-1 ring-inset ring-booqit-primary z-10' : ''}
                    hover:bg-gray-50
                  `}
                >
                  <div className={`
                    flex flex-col items-center justify-center p-1.5 sm:p-2
                    ${isCurrentDay ? 'bg-booqit-primary text-white' : ''}
                  `}>
                    <div className="text-[10px] xs:text-xs sm:text-xs uppercase font-medium tracking-wider">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-base xs:text-lg sm:text-xl font-bold my-0.5">
                      {format(day, 'd')}
                    </div>
                    <div className="text-[10px] xs:text-xs sm:text-xs">
                      {format(day, 'MMM')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Bookings */}
        <div className="sm:col-span-3">
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-base sm:text-lg flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, 'MMMM d, yyyy')} Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
                </div>
              ) : todayBookings.length === 0 ? (
                <div className="text-center py-6 border rounded-md bg-gray-50">
                  <CalendarX className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">No bookings for this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBookings.map(booking => (
                    <Card key={booking.id} className="overflow-hidden border-l-4" style={{
                      borderLeftColor: booking.status === 'confirmed' ? '#22c55e' : 
                                      booking.status === 'pending' ? '#eab308' :
                                      booking.status === 'completed' ? '#3b82f6' : '#ef4444'
                    }}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <div className="bg-gray-100 p-1 rounded-full mr-2">
                              <Clock className="h-4 w-4 text-booqit-primary" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium">{booking.service?.name}</h3>
                              <p className="text-xs text-booqit-dark/60">
                                {booking.time_slot}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center mt-2">
                          <Store className="h-3 w-3 mr-1 text-booqit-dark/60" />
                          <span className="text-xs">{booking.merchant?.shop_name}</span>
                        </div>
                        
                        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                          <div className="flex justify-end mt-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-xs"
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this booking? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => cancelBooking(booking.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Cancel Booking
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Upcoming Bookings</h2>
        
        {bookings.length === 0 ? (
          <div className="text-center py-10 border rounded-md">
            <CalendarX className="h-8 w-8 mx-auto text-booqit-dark/30 mb-2" />
            <p className="text-booqit-dark/60 text-sm">You don't have any bookings yet.</p>
            <Button 
              className="mt-4 bg-booqit-primary" 
              onClick={handleExploreServices}
            >
              Explore Services
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings
              .filter(booking => booking.status !== 'cancelled' && booking.status !== 'completed')
              .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time_slot}`);
                const dateB = new Date(`${b.date}T${b.time_slot}`);
                return dateA.getTime() - dateB.getTime();
              })
              .slice(0, 3)
              .map(booking => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 grid grid-cols-12 gap-4">
                      <div className="col-span-12 md:col-span-2">
                        <div className="h-full flex flex-col justify-center items-center bg-gray-50 p-2 rounded-md">
                          <span className="text-xs text-gray-500">{format(parseISO(booking.date), 'MMM dd')}</span>
                          <span className="mt-1 text-sm font-medium">{booking.time_slot}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-12 md:col-span-7">
                        <h3 className="font-medium">{booking.service?.name}</h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Store className="h-4 w-4 mr-1" />
                          <span>{booking.merchant?.shop_name}</span>
                        </div>
                      </div>
                      
                      <div className="col-span-12 md:col-span-3 flex items-center justify-end">
                        <Badge className={`${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
            {bookings.filter(booking => booking.status !== 'cancelled' && booking.status !== 'completed').length > 0 && (
              <div className="flex justify-center mt-4">
                <Button 
                  variant="outline" 
                  className="border-booqit-primary text-booqit-primary hover:bg-booqit-primary/10"
                  onClick={handleExploreServices}
                >
                  Explore More Services
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
