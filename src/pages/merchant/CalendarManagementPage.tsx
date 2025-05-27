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
  ChevronRight,
  Check
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import StylistAvailabilityWidget from '@/components/merchant/StylistAvailabilityWidget';

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

  // Fetch bookings for the merchant with customer details
  const fetchBookings = async () => {
    if (!merchantId) return;
    
    setIsLoading(true);
    try {
      // First fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
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
          )
        `)
        .eq('merchant_id', merchantId);
      
      if (bookingsError) throw bookingsError;
      
      // Then fetch user profiles for all user_ids in bookings
      const userIds = [...new Set(bookingsData.map(booking => booking.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Create a map of user profiles for quick lookup
      const profilesMap = new Map(profilesData.map(profile => [profile.id, profile]));
      
      // Process the bookings data with proper typing
      const processedBookings = bookingsData.map((booking) => {
        const typedPaymentStatus = booking.payment_status as "pending" | "completed" | "failed" | "refunded";
        const typedStatus = booking.status as "pending" | "confirmed" | "completed" | "cancelled";
        const userProfile = profilesMap.get(booking.user_id);
        
        return {
          ...booking,
          status: typedStatus,
          payment_status: typedPaymentStatus,
          user_details: userProfile ? {
            name: userProfile.name || 'Unknown Customer',
            email: userProfile.email || '',
            phone: userProfile.phone || ''
          } : undefined
        } as BookingWithUserDetails;
      });
      
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

  useEffect(() => {
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

  // Filter bookings for the selected day
  const todayBookings = useMemo(() => {
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      return isSameDay(bookingDate, date);
    }).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  }, [bookings, date]);

  // Handle booking status change with confirmation
  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
        
      if (error) throw error;
      
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

  // Handle phone call
  const handlePhoneCall = (phoneNumber: string) => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
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

  // Navigation functions
  const goToPrevious = () => setDate(subDays(date, isMobile ? 3 : 5));
  const goToNext = () => setDate(addDays(date, isMobile ? 3 : 5));
  const goToToday = () => setDate(new Date());

  // Handle availability change
  const handleAvailabilityChange = () => {
    fetchBookings();
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 bg-gradient-to-br from-booqit-light to-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-booqit-dark bg-gradient-to-r from-booqit-primary to-booqit-secondary bg-clip-text text-transparent">
          Calendar Management
        </h1>
        <p className="text-booqit-dark/70 mt-1">Manage your appointments and bookings</p>
      </div>
      
      {/* Calendar View */}
      <Card className="mb-6 overflow-hidden shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-booqit-primary to-booqit-secondary py-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white text-lg sm:text-xl font-semibold">Appointments</CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="secondary"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              
              <Button 
                variant="secondary"
                size="sm"
                className="h-9 text-sm font-medium px-3 bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={goToToday}
              >
                Today
              </Button>
              
              <Button 
                variant="secondary"
                size="sm"
                className="h-9 w-9 p-0 rounded-full bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
              
              <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="secondary"
                    size="sm"
                    className="h-9 px-3 ml-2 bg-white/20 hover:bg-white/30 text-white border-0"
                    onClick={() => {
                      setNewHoliday(date);
                      setHolidayDialogOpen(true);
                    }}
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    <span className="text-sm hidden xs:inline">Holiday</span>
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
                    ${isSelectedDay ? 'bg-gradient-to-b from-booqit-primary/10 to-booqit-primary/5 ring-2 ring-inset ring-booqit-primary z-10' : ''}
                    ${isHolidayDay ? 'cursor-not-allowed' : 'hover:bg-booqit-primary/5'}
                  `}
                >
                  <div className={`
                    flex flex-col items-center justify-center p-2 sm:p-3 transition-all
                    ${isCurrentDay ? 'bg-gradient-to-r from-booqit-primary to-booqit-secondary text-white shadow-lg' : ''}
                    ${isHolidayDay ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : ''}
                  `}>
                    <div className="text-xs sm:text-sm uppercase font-medium tracking-wider opacity-90">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold my-1">
                      {format(day, 'd')}
                    </div>
                    <div className="text-xs sm:text-sm opacity-90">
                      {format(day, 'MMM')}
                    </div>
                  </div>
                  
                  <div className="py-2 px-2 text-center text-xs sm:text-sm font-medium">
                    {isHolidayDay ? (
                      <span className="text-red-500 font-semibold">Holiday</span>
                    ) : bookingsCount > 0 ? (
                      <div className="bg-booqit-primary/10 text-booqit-primary px-2 py-1 rounded-full">
                        {bookingsCount} {bookingsCount === 1 ? 'appt' : 'appts'}
                      </div>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Bookings with Enhanced Design */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-booqit-teal/10 to-booqit-primary/10 py-4 border-b border-booqit-primary/10">
              <CardTitle className="text-lg sm:text-xl flex items-center text-booqit-dark">
                <CalendarCheck className="mr-3 h-5 w-5 text-booqit-primary" />
                {format(date, 'MMMM d, yyyy')} Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-booqit-primary/20 border-t-booqit-primary"></div>
                </div>
              ) : isHoliday(date) ? (
                <div className="text-center py-8 border-2 border-dashed border-red-200 rounded-xl bg-red-50">
                  <CalendarX className="h-12 w-12 mx-auto text-red-400 mb-3" />
                  <p className="text-red-600 text-lg font-medium">Shop Holiday - Closed</p>
                  <p className="text-red-500 text-sm mt-1">{getHolidayDescription(date)}</p>
                </div>
              ) : todayBookings.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                  <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 text-lg">No bookings for this date</p>
                  <p className="text-gray-400 text-sm mt-1">Your schedule is free today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayBookings.map(booking => (
                    <Card key={booking.id} className="overflow-hidden border-l-4 shadow-md hover:shadow-lg transition-all duration-200" style={{
                      borderLeftColor: booking.status === 'confirmed' ? '#4ECDC4' : 
                                      booking.status === 'pending' ? '#FFD166' :
                                      booking.status === 'completed' ? '#7E57C2' : '#FF6B6B'
                    }}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center">
                            <div className="bg-gradient-to-r from-booqit-primary to-booqit-secondary p-2 rounded-full mr-3">
                              <Clock className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-booqit-dark">{booking.service?.name}</h3>
                              <p className="text-booqit-primary font-medium">
                                {booking.time_slot}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            className={`
                              px-3 py-1 text-white font-medium rounded-full
                              ${booking.status === 'confirmed' ? 'bg-booqit-teal' : 
                                booking.status === 'pending' ? 'bg-booqit-yellow' :
                                booking.status === 'completed' ? 'bg-booqit-primary' : 'bg-booqit-secondary'}
                            `}
                          >
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="bg-booqit-light/50 rounded-lg p-3 mb-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-booqit-primary" />
                              <span className="font-medium text-booqit-dark">
                                {booking.user_details?.name || 'Unknown Customer'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-booqit-primary" />
                              {booking.user_details?.phone ? (
                                <button
                                  onClick={() => handlePhoneCall(booking.user_details!.phone)}
                                  className="text-booqit-primary hover:text-booqit-secondary font-medium underline transition-colors duration-200 bg-white/80 px-2 py-1 rounded"
                                >
                                  {booking.user_details.phone}
                                </button>
                              ) : (
                                <span className="text-gray-400 italic">No phone</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                          <div className="flex justify-end gap-2 mt-3">
                            {booking.status === 'pending' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="default"
                                    size="sm"
                                    className="bg-booqit-teal hover:bg-booqit-teal/90 text-white shadow-md"
                                  >
                                    <Check className="mr-1 h-4 w-4" />
                                    Confirm
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to confirm this booking for {booking.user_details?.name || 'the customer'}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleStatusChange(booking.id, 'confirmed')}
                                      className="bg-booqit-teal hover:bg-booqit-teal/90"
                                    >
                                      Confirm Booking
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            
                            {booking.status === 'confirmed' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="default"
                                    size="sm"
                                    className="bg-booqit-primary hover:bg-booqit-primary/90 text-white shadow-md"
                                  >
                                    <Check className="mr-1 h-4 w-4" />
                                    Complete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Complete Booking</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Mark this booking as completed for {booking.user_details?.name || 'the customer'}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleStatusChange(booking.id, 'completed')}
                                      className="bg-booqit-primary hover:bg-booqit-primary/90"
                                    >
                                      Mark Complete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive"
                                  size="sm"
                                  className="bg-booqit-secondary hover:bg-booqit-secondary/90 shadow-md"
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this booking for {booking.user_details?.name || 'the customer'}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleStatusChange(booking.id, 'cancelled')}
                                    className="bg-booqit-secondary hover:bg-booqit-secondary/90"
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
        
        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Stylist Availability Widget */}
          {merchantId && (
            <StylistAvailabilityWidget 
              merchantId={merchantId}
              selectedDate={date}
              onAvailabilityChange={handleAvailabilityChange}
            />
          )}
          
          {/* Shop Holidays */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 py-4 border-b border-red-100">
              <CardTitle className="text-lg flex items-center text-booqit-dark">
                <Flag className="mr-2 h-5 w-5 text-red-500" />
                Shop Holidays
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
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
