
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Clock, User, Calendar as CalendarCheck, Phone, Check, X } from 'lucide-react';

const CalendarManagementPage: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
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

  // Fetch bookings for the merchant
  useEffect(() => {
    const fetchBookings = async () => {
      if (!merchantId) return;
      
      setIsLoading(true);
      try {
        let query = supabase
          .from('bookings')
          .select(`
            *,
            service:service_id (
              name,
              price,
              duration
            ),
            user_details:user_id (
              name:profiles!inner(name),
              email:profiles!inner(email),
              phone:profiles!inner(phone)
            )
          `)
          .eq('merchant_id', merchantId);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setBookings(data as unknown as Booking[]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch bookings. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookings();
  }, [merchantId]);

  // Filter bookings by date and status
  const filteredBookings = bookings.filter(booking => {
    const matchesDate = !date || booking.date === format(date, 'yyyy-MM-dd');
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  // Get dates with bookings for calendar highlighting
  const datesWithBookings = bookings.map(booking => parseISO(booking.date));

  // Handle booking status change
  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
        
      if (error) throw error;
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus } 
          : booking
      ));
      
      toast({
        title: "Success",
        description: `Booking ${newStatus} successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update booking. Please try again.",
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
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Calendar Management</h1>
        <p className="text-booqit-dark/70">View and manage your appointment schedule</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border"
                  highlightedDates={datesWithBookings}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setDate(undefined)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'All dates'}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select 
                    value={statusFilter} 
                    onValueChange={(value) => setStatusFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarCheck className="mr-2 h-5 w-5" />
                {date 
                  ? `Bookings for ${format(date, 'MMMM d, yyyy')}` 
                  : statusFilter !== 'all' 
                    ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} bookings`
                    : 'All Bookings'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-10 border rounded-md">
                  <Calendar className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                  <p className="text-booqit-dark/60">No bookings found for the selected filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map(booking => (
                    <Card key={booking.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-4">
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                              <div className="bg-gray-100 p-2 rounded-full mr-3">
                                <Clock className="h-5 w-5 text-booqit-primary" />
                              </div>
                              <div>
                                <h3 className="font-medium">{booking.service?.name}</h3>
                                <p className="text-sm text-booqit-dark/60">
                                  {format(parseISO(booking.date), 'MMM dd, yyyy')} at {booking.time_slot}
                                </p>
                              </div>
                            </div>
                            <Badge className={`${getStatusColor(booking.status)}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </div>
                          
                          <Separator className="my-4" />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Customer Details</h4>
                              <div className="space-y-2">
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2 text-booqit-dark/60" />
                                  <span className="text-sm">{(booking as any).user_details?.name || 'Customer'}</span>
                                </div>
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-2 text-booqit-dark/60" />
                                  <span className="text-sm">{(booking as any).user_details?.phone || 'No phone'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-2">Service Details</h4>
                              <div className="space-y-2">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-booqit-dark/60" />
                                  <span className="text-sm">{booking.service?.duration} minutes</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="h-4 w-4 mr-2 inline-flex items-center justify-center text-booqit-dark/60">₹</span>
                                  <span className="text-sm">{booking.service?.price}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <>
                              <Separator className="my-4" />
                              
                              <div className="flex justify-end space-x-2">
                                {booking.status === 'pending' && (
                                  <Button 
                                    variant="default"
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600"
                                    onClick={() => handleStatusChange(booking.id, 'confirmed')}
                                  >
                                    <Check className="mr-1 h-4 w-4" />
                                    Confirm
                                  </Button>
                                )}
                                
                                {booking.status === 'confirmed' && (
                                  <Button 
                                    variant="default"
                                    size="sm"
                                    className="bg-blue-500 hover:bg-blue-600"
                                    onClick={() => handleStatusChange(booking.id, 'completed')}
                                  >
                                    <Check className="mr-1 h-4 w-4" />
                                    Mark as Completed
                                  </Button>
                                )}
                                
                                <Button 
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleStatusChange(booking.id, 'cancelled')}
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Cancel
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarManagementPage;
