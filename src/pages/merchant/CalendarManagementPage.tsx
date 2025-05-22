
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types';
import { format, parseISO, addDays, subDays, isSameDay } from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  User, 
  Calendar as CalendarCheck, 
  Phone, 
  X, 
  Flag, 
  CalendarX,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface BookingWithUserDetails extends Booking {
  user_details?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface HolidayDate {
  id: string;
  holiday_date: string;
  description: string | null;
}

const CalendarManagementPage: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<BookingWithUserDetails[]>([]);
  const [holidays, setHolidays] = useState<HolidayDate[]>([]);
  const [newHoliday, setNewHoliday] = useState<Date | undefined>(new Date());
  const [holidayDescription, setHolidayDescription] = useState('');
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHolidayLoading, setIsHolidayLoading] = useState(false);
  const { toast } = useToast();
  const { userId } = useAuth();
  const isMobile = useIsMobile();

  // Calculate the 3 or 5 day range centered on the selected date based on screen size
  const visibleDays = useMemo(() => {
    const center = date;
    return isMobile ? 
      [
        subDays(center, 1),
        center,
        addDays(center, 1),
      ] : 
      [
        subDays(center, 2),
        subDays(center, 1),
        center,
        addDays(center, 1),
        addDays(center, 2),
      ];
  }, [date, isMobile]);

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
        // Using a simpler query that doesn't try to join with profiles
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            service:service_id (
              name,
              price,
              duration
            )
          `)
          .eq('merchant_id', merchantId);
        
        if (error) throw error;
        
        // Process the bookings data
        const processedBookings = await Promise.all(
          data.map(async (booking) => {
            // Cast payment_status to the correct type
            const typedPaymentStatus = booking.payment_status as "pending" | "completed" | "failed" | "refunded";
            const typedStatus = booking.status as "pending" | "confirmed" | "completed" | "cancelled";
            
            // If needed, fetch user details separately
            if (booking.user_id) {
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('name, email, phone')
                .eq('id', booking.user_id)
                .single();
              
              if (!userError && userData) {
                return {
                  ...booking,
                  status: typedStatus,
                  payment_status: typedPaymentStatus,
                  user_details: {
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone
                  }
                } as BookingWithUserDetails;
              }
            }
            
            return {
              ...booking,
              status: typedStatus,
              payment_status: typedPaymentStatus
            } as BookingWithUserDetails;
          })
        );
        
        setBookings(processedBookings);
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
  }, [merchantId, toast]);

  // Fetch holiday dates for the merchant
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!merchantId) return;
      
      setIsHolidayLoading(true);
      try {
        const { data, error } = await supabase
          .from('shop_holidays')
          .select('*')
          .eq('merchant_id', merchantId);
          
        if (error) throw error;
        
        setHolidays(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch holiday dates. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsHolidayLoading(false);
      }
    };
    
    fetchHolidays();
  }, [merchantId, toast]);

  // Filter bookings for the selected day
  const todayBookings = useMemo(() => {
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      return isSameDay(bookingDate, date);
    }).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  }, [bookings, date]);

  // Handle booking status change
  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
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

  // Add a new holiday date
  const addHolidayDate = async () => {
    if (!merchantId || !newHoliday) return;
    
    try {
      const { error } = await supabase
        .from('shop_holidays')
        .insert({
          merchant_id: merchantId,
          holiday_date: format(newHoliday, 'yyyy-MM-dd'),
          description: holidayDescription || null
        });
        
      if (error) {
        if (error.code === '23505') {
          throw new Error('This date is already marked as a holiday');
        }
        throw error;
      }
      
      // Refetch holiday dates
      const { data, error: fetchError } = await supabase
        .from('shop_holidays')
        .select('*')
        .eq('merchant_id', merchantId);
        
      if (fetchError) throw fetchError;
      
      setHolidays(data);
      setHolidayDescription('');
      setHolidayDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Holiday date added successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add holiday date. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete a holiday date
  const deleteHolidayDate = async (holidayId: string) => {
    try {
      const { error } = await supabase
        .from('shop_holidays')
        .delete()
        .eq('id', holidayId);
        
      if (error) throw error;
      
      // Update local state
      setHolidays(holidays.filter(holiday => holiday.id !== holidayId));
      
      toast({
        title: "Success",
        description: "Holiday date removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove holiday date. Please try again.",
        variant: "destructive",
      });
    }
  };

  const holidayDates = holidays.map(h => parseISO(h.holiday_date));

  // Check if a date is a holiday
  const isHoliday = (checkDate: Date) => {
    return holidayDates.some(holiday => isSameDay(holiday, checkDate));
  };

  // Get holiday description
  const getHolidayDescription = (checkDate: Date) => {
    const holiday = holidays.find(h => isSameDay(parseISO(h.holiday_date), checkDate));
    return holiday?.description || 'Shop Holiday';
  };

  // Get the number of bookings for a day
  const getBookingsCountForDay = (day: Date) => {
    return bookings.filter(b => isSameDay(parseISO(b.date), day)).length;
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

  // Navigate to previous set of days
  const goToPrevious = () => setDate(subDays(date, isMobile ? 3 : 5));
  
  // Navigate to next set of days
  const goToNext = () => setDate(addDays(date, isMobile ? 3 : 5));
  
  // Navigate to today
  const goToToday = () => setDate(new Date());

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-booqit-dark">Calendar Management</h1>
      </div>
      
      {/* Compact Calendar View */}
      <Card className="mb-4 overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-r from-booqit-primary/5 to-booqit-primary/10 py-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-booqit-dark text-base sm:text-lg">Appointments</CardTitle>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button 
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={goToToday}
              >
                Today
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
              
              <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-7 ml-1"
                    onClick={() => {
                      setNewHoliday(date);
                      setHolidayDialogOpen(true);
                    }}
                  >
                    <Flag className="h-3 w-3 mr-1" />
                    <span className="text-xs">Holiday</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[350px] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Mark Shop Holiday</DialogTitle>
                    <DialogDescription>
                      {isHoliday(date) 
                        ? "This date is already marked as a holiday."
                        : "Mark this date as a shop holiday. Customers won't be able to book on this date."}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="mt-2 space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Date</label>
                      <div className="p-2 bg-gray-50 rounded-md text-center">
                        {format(newHoliday || date, 'MMMM d, yyyy')}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Textarea 
                        placeholder="Add description for this holiday"
                        value={holidayDescription}
                        onChange={(e) => setHolidayDescription(e.target.value)}
                        className="resize-none"
                      />
                    </div>
                    
                    <DialogFooter className="flex gap-2">
                      {isHoliday(date) && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            const holiday = holidays.find(h => 
                              isSameDay(parseISO(h.holiday_date), date)
                            );
                            if (holiday) {
                              deleteHolidayDate(holiday.id);
                              setHolidayDialogOpen(false);
                            }
                          }}
                        >
                          Remove
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        onClick={addHolidayDate}
                      >
                        {isHoliday(date) ? 'Update' : 'Save'}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="flex w-full">
            {visibleDays.map((day, index) => {
              const isCurrentDay = isSameDay(day, new Date());
              const isSelectedDay = isSameDay(day, date);
              const isHolidayDay = isHoliday(day);
              const bookingsCount = getBookingsCountForDay(day);
              
              return (
                <div 
                  key={index}
                  onClick={() => !isHolidayDay && setDate(day)}
                  className={`
                    flex-1 transition-all cursor-pointer border-r last:border-r-0 border-gray-100
                    ${isSelectedDay ? 'bg-purple-100 ring-2 ring-inset ring-booqit-primary z-10' : ''}
                    ${isHolidayDay ? 'cursor-not-allowed' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    flex flex-col items-center justify-center p-2 sm:p-3
                    ${isCurrentDay ? 'bg-booqit-primary text-white' : ''}
                    ${isHolidayDay ? 'bg-red-500 text-white' : ''}
                  `}>
                    <div className="text-[10px] sm:text-xs uppercase font-medium tracking-wider">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-lg sm:text-2xl font-bold my-1">
                      {format(day, 'd')}
                    </div>
                    <div className="text-[10px] sm:text-xs">
                      {format(day, 'MMM')}
                    </div>
                  </div>
                  
                  <div className="py-1 px-1 text-center text-[10px] sm:text-xs font-medium">
                    {isHolidayDay ? (
                      <span className="text-red-500">Holiday</span>
                    ) : bookingsCount > 0 ? (
                      <span>{bookingsCount} {bookingsCount === 1 ? 'appt' : 'appts'}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Bookings */}
        <div className="sm:col-span-2">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base sm:text-lg flex items-center">
                <CalendarCheck className="mr-2 h-4 w-4" />
                {format(date, 'MMMM d, yyyy')} Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
                </div>
              ) : isHoliday(date) ? (
                <div className="text-center py-6 border rounded-md bg-red-50">
                  <CalendarX className="h-8 w-8 mx-auto text-red-400 mb-2" />
                  <p className="text-red-600 text-sm font-medium">Shop Holiday - Closed</p>
                  <p className="text-red-500 text-xs mt-1">{getHolidayDescription(date)}</p>
                </div>
              ) : todayBookings.length === 0 ? (
                <div className="text-center py-6 border rounded-md bg-gray-50">
                  <CalendarIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
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
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="text-xs">
                            <div className="flex items-center">
                              <User className="h-3 w-3 mr-1 text-booqit-dark/60" />
                              <span>{booking.user_details?.name || 'Customer'}</span>
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1 text-booqit-dark/60" />
                              <span>{booking.user_details?.phone || 'No phone'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                          <div className="flex justify-end gap-1 mt-2">
                            {booking.status === 'pending' && (
                              <Button 
                                variant="default"
                                size="sm"
                                className="h-7 text-xs bg-green-500 hover:bg-green-600"
                                onClick={() => handleStatusChange(booking.id, 'confirmed')}
                              >
                                Confirm
                              </Button>
                            )}
                            
                            {booking.status === 'confirmed' && (
                              <Button 
                                variant="default"
                                size="sm"
                                className="h-7 text-xs bg-blue-500 hover:bg-blue-600"
                                onClick={() => handleStatusChange(booking.id, 'completed')}
                              >
                                Complete
                              </Button>
                            )}
                            
                            <Button 
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleStatusChange(booking.id, 'cancelled')}
                            >
                              Cancel
                            </Button>
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
        
        {/* Holiday List */}
        <div className="sm:col-span-1">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base sm:text-lg flex items-center">
                <Flag className="mr-2 h-4 w-4 text-red-500" />
                Shop Holidays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isHolidayLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
                </div>
              ) : holidays.length === 0 ? (
                <div className="text-center py-6 border rounded-md">
                  <CalendarX className="h-8 w-8 mx-auto text-booqit-dark/30 mb-2" />
                  <p className="text-booqit-dark/60 text-sm">No holidays marked</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-1">Date</TableHead>
                        <TableHead className="w-[40px] text-right py-1">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays
                        .sort((a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime())
                        .map((holiday) => (
                          <TableRow key={holiday.id}>
                            <TableCell className="py-1 text-xs">
                              {format(parseISO(holiday.holiday_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="text-right py-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteHolidayDate(holiday.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
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
