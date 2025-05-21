
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Store, Check, X } from 'lucide-react';

const CalendarPage: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userId } = useAuth();

  // Fetch bookings for the user
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
              name,
              price,
              duration
            ),
            merchant:merchant_id (
              shop_name,
              address,
              image_url
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
  }, [userId]);

  // Filter bookings for the selected date
  const selectedDateBookings = bookings.filter(booking => {
    if (!date) return false;
    return booking.date === format(date, 'yyyy-MM-dd');
  });

  // Get dates with bookings for calendar highlighting
  const datesWithBookings = bookings.map(booking => parseISO(booking.date));

  // Handle booking cancellation
  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'cancelled' } 
          : booking
      ));
      
      toast({
        title: "Success",
        description: "Booking has been cancelled.",
      });
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

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Your Calendar</h1>
        <p className="text-booqit-dark/70">Manage your upcoming appointments</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
                modifiers={{
                  highlighted: datesWithBookings
                }}
                modifiersStyles={{
                  highlighted: { fontWeight: 'bold', backgroundColor: 'rgba(0, 120, 255, 0.1)' }
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              {date ? format(date, 'MMMM d, yyyy') : 'All Bookings'}
            </h2>
            
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
              </div>
            ) : selectedDateBookings.length > 0 ? (
              <div className="space-y-4">
                {selectedDateBookings.map(booking => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-2">
                          <div className="h-full flex flex-col justify-center items-center bg-gray-50 p-2 rounded-md">
                            <Clock className="h-6 w-6 text-booqit-primary" />
                            <span className="mt-1 text-sm font-medium">{booking.time_slot}</span>
                          </div>
                        </div>
                        
                        <div className="col-span-12 md:col-span-7">
                          <h3 className="font-medium">{booking.service?.name}</h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Store className="h-4 w-4 mr-1" />
                            <span>{booking.merchant?.shop_name}</span>
                          </div>
                          <div className="flex items-center mt-2">
                            <Badge className={`${getStatusColor(booking.status)}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                            <span className="ml-2 text-sm">
                              {booking.service?.duration} mins | ₹{booking.service?.price}
                            </span>
                          </div>
                        </div>
                        
                        <div className="col-span-12 md:col-span-3 flex items-center justify-end">
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => cancelBooking(booking.id)}
                            >
                              <X className="mr-1 h-4 w-4" />
                              Cancel
                            </Button>
                          )}
                          
                          {booking.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              <Check className="mr-1 h-4 w-4" />
                              Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-booqit-dark/70">No bookings found for this date.</p>
              </div>
            )}
          </div>
          
          <Separator className="my-6" />
          
          <div>
            <h2 className="text-lg font-semibold mb-4">Upcoming Bookings</h2>
            
            {bookings.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-booqit-dark/70">You don't have any bookings yet.</p>
                <Button className="mt-4 bg-booqit-primary" onClick={() => window.location.href = '/search'}>
                  Explore Services
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings
                  .filter(booking => booking.status !== 'cancelled' && booking.status !== 'completed')
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
