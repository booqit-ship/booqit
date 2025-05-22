
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { format, parseISO, addDays, subDays, isSameDay, startOfDay } from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  User, 
  Calendar as CalendarCheck, 
  Phone, 
  Check, 
  X, 
  Flag, 
  CalendarX,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isHolidayLoading, setIsHolidayLoading] = useState(false);
  const { toast } = useToast();
  const { userId } = useAuth();

  // Calculate the 5 day range centered on the selected date
  const visibleDays = useMemo(() => {
    const center = date;
    return [
      subDays(center, 2),
      subDays(center, 1),
      center,
      addDays(center, 1),
      addDays(center, 2),
    ];
  }, [date]);

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
        
        // Ensure the status is of the correct type
        const typedBookings: BookingWithUserDetails[] = data.map((booking: any) => ({
          ...booking,
          status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'
        }));
        
        setBookings(typedBookings);
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
  }, [merchantId]);

  // Filter bookings by date and status
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = parseISO(booking.date);
    const isVisibleDay = visibleDays.some(day => isSameDay(bookingDate, day));
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return isVisibleDay && matchesStatus;
  });

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
    return filteredBookings.filter(b => isSameDay(parseISO(b.date), day)).length;
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
  const goToPrevious = () => setDate(subDays(date, 5));
  
  // Navigate to next set of days
  const goToNext = () => setDate(addDays(date, 5));
  
  // Navigate to today
  const goToToday = () => setDate(new Date());

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Calendar Management</h1>
        <p className="text-booqit-dark/70">View and manage your appointment schedule</p>
      </div>
      
      {/* Modern 5-Day Calendar View */}
      <Card className="mb-6 overflow-hidden shadow-md">
        <CardHeader className="bg-gradient-to-r from-booqit-primary/5 to-booqit-primary/10 pb-3 pt-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-booqit-dark">Appointment Calendar</CardTitle>
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full"
                      onClick={goToPrevious}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Previous 5 days
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button 
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={goToToday}
              >
                Today
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full"
                      onClick={goToNext}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Next 5 days
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              const holidayDesc = isHolidayDay ? getHolidayDescription(day) : null;
              
              return (
                <div 
                  key={index}
                  onClick={() => !isHolidayDay && setDate(day)}
                  className={`
                    flex-1 transition-all duration-200 ease-in-out cursor-pointer border-r last:border-r-0 border-gray-100
                    ${isSelectedDay ? 'ring-2 ring-inset ring-booqit-primary z-10' : ''}
                    ${isHolidayDay ? 'cursor-not-allowed' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    flex flex-col items-center justify-center p-4 md:p-6
                    ${isCurrentDay ? 'bg-booqit-primary text-white' : ''}
                    ${isHolidayDay ? 'bg-red-500 text-white' : ''}
                  `}>
                    <div className="text-xs uppercase font-medium tracking-wider">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-2xl font-bold my-1">
                      {format(day, 'd')}
                    </div>
                    <div className="text-xs">
                      {format(day, 'MMM')}
                    </div>
                    
                    {isHolidayDay && (
                      <Badge variant="outline" className="mt-1 border-white text-white text-[10px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[90%]">
                        Holiday
                      </Badge>
                    )}
                  </div>
                  
                  <div className={`
                    p-2 text-center text-xs font-medium
                    ${isHolidayDay ? 'text-red-500' : ''}
                  `}>
                    {isHolidayDay ? (
                      <span>Closed</span>
                    ) : bookingsCount === 0 ? (
                      <span className="text-gray-500">No bookings</span>
                    ) : (
                      <span>{bookingsCount} {bookingsCount === 1 ? 'booking' : 'bookings'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Selected Date Status Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center mb-3 sm:mb-0">
              <CalendarCheck className="mr-2 h-5 w-5 text-booqit-primary" />
              <span className="font-medium">{format(date, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            
            <div className="flex items-center">
              {isHoliday(date) ? (
                <div className="flex items-center text-red-500">
                  <Badge variant="destructive" className="mr-2">Holiday</Badge>
                  <span>Shop Holiday – Bookings disabled</span>
                </div>
              ) : (
                <div className="flex items-center">
                  {getBookingsCountForDay(date) === 0 ? (
                    <div className="flex items-center text-gray-500">
                      <Badge variant="outline" className="mr-2">Available</Badge>
                      <span>No appointments scheduled</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-green-600">
                      <Badge className="mr-2 bg-green-100 text-green-800 border-green-200">
                        Active
                      </Badge>
                      <span>Available for bookings</span>
                    </div>
                  )}
                </div>
              )}
              
              <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="ml-4"
                    onClick={() => {
                      setNewHoliday(date);
                      setHolidayDialogOpen(true);
                    }}
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    {isHoliday(date) ? 'Edit Holiday' : 'Mark Holiday'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mark Shop Holiday</DialogTitle>
                    <DialogDescription>
                      {isHoliday(date) 
                        ? 'This date is already marked as a holiday. You can update the description or remove it.'
                        : 'Select a date to mark as a shop holiday. Customers won't be able to book on this date.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date</label>
                      <div className="p-2 bg-gray-50 rounded-md text-center">
                        {format(newHoliday || date, 'MMMM d, yyyy')}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Textarea 
                        placeholder="Add description for this holiday"
                        value={holidayDescription}
                        onChange={(e) => setHolidayDescription(e.target.value)}
                        className="resize-none"
                      />
                    </div>
                    
                    <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-2 sm:gap-0">
                      {isHoliday(date) && (
                        <Button 
                          variant="destructive" 
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
                          <X className="mr-2 h-4 w-4" />
                          Remove Holiday
                        </Button>
                      )}
                      
                      <Button 
                        onClick={addHolidayDate}
                        className="w-full sm:w-auto"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        {isHoliday(date) ? 'Update Holiday' : 'Mark as Holiday'}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Filter Section */}
      <Card className="mb-6">
        <CardContent className="py-4 px-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Filter by status:</span>
              <ToggleGroup type="single" value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)}>
                <ToggleGroupItem value="all" aria-label="All statuses" className="text-xs px-3 py-1 h-7">
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="pending" aria-label="Pending" className="text-xs px-3 py-1 h-7">
                  Pending
                </ToggleGroupItem>
                <ToggleGroupItem value="confirmed" aria-label="Confirmed" className="text-xs px-3 py-1 h-7">
                  Confirmed
                </ToggleGroupItem>
                <ToggleGroupItem value="completed" aria-label="Completed" className="text-xs px-3 py-1 h-7">
                  Completed
                </ToggleGroupItem>
                <ToggleGroupItem value="cancelled" aria-label="Cancelled" className="text-xs px-3 py-1 h-7">
                  Cancelled
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bookings & Holiday Lists */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Booking Details */}
        <div className="md:col-span-8">
          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-lg flex items-center">
                <CalendarCheck className="mr-2 h-5 w-5" />
                Bookings for {format(date, 'MMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
                </div>
              ) : isHoliday(date) ? (
                <div className="text-center py-10 border rounded-md bg-red-50">
                  <CalendarX className="h-12 w-12 mx-auto text-red-400 mb-2" />
                  <p className="text-red-600 font-medium">Shop Holiday - Bookings disabled</p>
                  <p className="text-red-500 text-sm mt-1">{getHolidayDescription(date)}</p>
                </div>
              ) : filteredBookings.filter(b => isSameDay(parseISO(b.date), date)).length === 0 ? (
                <div className="text-center py-10 border rounded-md bg-gray-50">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No bookings for this date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings
                    .filter(b => isSameDay(parseISO(b.date), date))
                    .sort((a, b) => a.time_slot.localeCompare(b.time_slot))
                    .map(booking => (
                      <Card key={booking.id} className="overflow-hidden border-l-4" style={{
                        borderLeftColor: booking.status === 'confirmed' ? '#22c55e' : 
                                        booking.status === 'pending' ? '#eab308' :
                                        booking.status === 'completed' ? '#3b82f6' : '#ef4444'
                      }}>
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
                                    {booking.time_slot}
                                  </p>
                                </div>
                              </div>
                              <Badge className={getStatusColor(booking.status)}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </Badge>
                            </div>
                            
                            <Separator className="my-3" />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium mb-2">Customer Details</h4>
                                <div className="space-y-2">
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-2 text-booqit-dark/60" />
                                    <span className="text-sm">{booking.user_details?.name || 'Customer'}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-2 text-booqit-dark/60" />
                                    <span className="text-sm">{booking.user_details?.phone || 'No phone'}</span>
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
                                <Separator className="my-3" />
                                
                                <div className="flex justify-end gap-2">
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
                                      Complete
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
        
        {/* Holiday List */}
        <div className="md:col-span-4">
          <Card className="shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-lg flex justify-between items-center">
                <span className="flex items-center">
                  <Flag className="mr-2 h-5 w-5 text-red-500" />
                  Shop Holidays
                </span>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Flag className="mr-1 h-3 w-3" />
                      Add Holiday
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mark Shop Holiday</DialogTitle>
                      <DialogDescription>
                        Select a date to mark as a shop holiday. Customers won't be able to book on these dates.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Date</label>
                        <Calendar
                          mode="single"
                          selected={newHoliday}
                          onSelect={setNewHoliday}
                          className="border rounded-md mx-auto"
                          modifiers={{
                            holiday: holidayDates
                          }}
                          modifiersStyles={{
                            holiday: { backgroundColor: "#fee2e2", color: "#ef4444", fontWeight: "bold" }
                          }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description (Optional)</label>
                        <Textarea 
                          placeholder="Add description for this holiday"
                          value={holidayDescription}
                          onChange={(e) => setHolidayDescription(e.target.value)}
                          className="resize-none"
                        />
                      </div>
                      
                      <Button 
                        onClick={addHolidayDate}
                        className="w-full"
                      >
                        Mark as Holiday
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isHolidayLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
                </div>
              ) : holidays.length === 0 ? (
                <div className="text-center py-10 border rounded-md">
                  <CalendarX className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                  <p className="text-booqit-dark/60">No holidays marked yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="hidden sm:table-cell">Description</TableHead>
                        <TableHead className="w-[50px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays
                        .sort((a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime())
                        .map((holiday) => (
                          <TableRow key={holiday.id}>
                            <TableCell className="font-medium">
                              {format(parseISO(holiday.holiday_date), 'MMM dd, yyyy')}
                              <div className="sm:hidden text-xs text-gray-500 mt-1 line-clamp-1">
                                {holiday.description || 'No description'}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{holiday.description || 'No description'}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteHolidayDate(holiday.id)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
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
