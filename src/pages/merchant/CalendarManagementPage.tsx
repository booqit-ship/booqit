
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
import { format, parseISO, addDays, subDays, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  User, 
  Calendar as CalendarCheck, 
  Phone, 
  Check, 
  X, 
  Flag, 
  CalendarX 
} from 'lucide-react';

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
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isHolidayLoading, setIsHolidayLoading] = useState(false);
  const { toast } = useToast();
  const { userId } = useAuth();

  // Calculate the 5 day range centered on the selected date
  const visibleDays = useMemo(() => {
    const today = date;
    return [
      subDays(today, 2),
      subDays(today, 1),
      today,
      addDays(today, 1),
      addDays(today, 2),
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
    if (!merchantId) return;
    
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

  // Check if a date is a holiday
  const isHoliday = (date: Date) => {
    return holidays.some(holiday => 
      isSameDay(parseISO(holiday.holiday_date), date)
    );
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
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <div className="md:col-span-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Calendar</span>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center">
                        <Flag className="mr-2 h-4 w-4" />
                        Mark Holiday
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Mark Shop Holiday</SheetTitle>
                        <SheetDescription>
                          Select a date to mark as a shop holiday. Customers won't be able to book appointments on holiday dates.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Date</label>
                          <Calendar
                            mode="single"
                            selected={newHoliday}
                            onSelect={setNewHoliday}
                            className="border rounded-md"
                            modifiers={{
                              holiday: holidays.map(h => parseISO(h.holiday_date))
                            }}
                            modifiersClassNames={{
                              holiday: "bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 rounded-full"
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
                    </SheetContent>
                  </Sheet>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  className="rounded-md border"
                  modifiers={{
                    holiday: holidays.map(h => parseISO(h.holiday_date))
                  }}
                  modifiersClassNames={{
                    holiday: "bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 rounded-full"
                  }}
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
                    onClick={() => setDate(new Date())}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'PPP')}
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
            
            <Card>
              <CardHeader>
                <CardTitle>Shop Holidays</CardTitle>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays
                        .sort((a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime())
                        .map((holiday) => (
                          <TableRow key={holiday.id}>
                            <TableCell className="font-medium">{format(parseISO(holiday.holiday_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{holiday.description || 'No description'}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteHolidayDate(holiday.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="md:col-span-8">
          {/* 5-Day View */}
          <div className="mb-6">
            <div className="flex space-x-1 md:space-x-4 justify-between">
              {visibleDays.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const isHolidayDate = isHoliday(day);
                
                return (
                  <div 
                    key={index}
                    className={`relative flex-1 rounded-lg overflow-hidden shadow-sm border cursor-pointer transition-all 
                      ${isSameDay(day, date) ? 'ring-2 ring-booqit-primary' : ''} 
                      ${isHolidayDate ? 'bg-red-50 border-red-200' : isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
                    onClick={() => setDate(day)}
                  >
                    <div className={`text-center py-3 ${isHolidayDate ? 'text-red-600' : isToday ? 'text-blue-600' : ''}`}>
                      <div className="text-xs uppercase font-bold">{format(day, 'EEE')}</div>
                      <div className="text-xl font-bold">{format(day, 'd')}</div>
                      <div className="text-xs">{format(day, 'MMM')}</div>
                      
                      {isToday && (
                        <div className="absolute top-1 right-1">
                          <Badge variant="secondary" className="text-[10px] h-4 bg-blue-500 text-white">Today</Badge>
                        </div>
                      )}
                      
                      {isHolidayDate && (
                        <div className="absolute top-1 right-1">
                          <Badge variant="destructive" className="text-[10px] h-4">Holiday</Badge>
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <span className="text-xs font-medium">
                          {filteredBookings.filter(b => isSameDay(parseISO(b.date), day)).length} bookings
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarCheck className="mr-2 h-5 w-5" />
                Bookings for {format(date, 'MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
                </div>
              ) : filteredBookings.filter(b => isSameDay(parseISO(b.date), date)).length === 0 ? (
                <div className="text-center py-10 border rounded-md">
                  <Calendar className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                  <p className="text-booqit-dark/60">No bookings for the selected date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings
                    .filter(b => isSameDay(parseISO(b.date), date))
                    .sort((a, b) => a.time_slot.localeCompare(b.time_slot))
                    .map(booking => (
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
                                <Separator className="my-4" />
                                
                                <div className="flex justify-end space-y-2 flex-col">
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
