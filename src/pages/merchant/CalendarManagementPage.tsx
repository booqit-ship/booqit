
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types';
import { format, parseISO, addDays, subDays, isSameDay } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import StylistAvailabilityWidget from '@/components/merchant/StylistAvailabilityWidget';
import CalendarNavigation from '@/components/merchant/calendar/CalendarNavigation';
import CalendarDays from '@/components/merchant/calendar/CalendarDays';
import BookingsList from '@/components/merchant/calendar/BookingsList';
import HolidayManager from '@/components/merchant/calendar/HolidayManager';

interface BookingWithCustomerDetails extends Booking {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

interface HolidayDate {
  id: string;
  holiday_date: string;
  description: string | null;
}

const CalendarManagementPage: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<BookingWithCustomerDetails[]>([]);
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
      console.log('Fetching bookings for merchant:', merchantId);
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          merchant_id,
          service_id,
          date,
          time_slot,
          status,
          payment_status,
          created_at,
          staff_id,
          customer_name,
          customer_phone,
          customer_email,
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
        .eq('merchant_id', merchantId)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });
      
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }
      
      console.log('Merchant bookings fetched:', bookingsData);
      
      const processedBookings = bookingsData?.map((booking) => {
        console.log('Processing booking:', booking.id, 'Customer details:', {
          name: booking.customer_name,
          phone: booking.customer_phone,
          email: booking.customer_email
        });
        
        return {
          id: booking.id,
          user_id: booking.user_id,
          merchant_id: booking.merchant_id,
          service_id: booking.service_id,
          date: booking.date,
          time_slot: booking.time_slot,
          status: booking.status as "pending" | "confirmed" | "completed" | "cancelled",
          payment_status: booking.payment_status as "pending" | "completed" | "failed" | "refunded",
          created_at: booking.created_at,
          staff_id: booking.staff_id,
          service: booking.service,
          customer_name: booking.customer_name || 'Unknown Customer',
          customer_phone: booking.customer_phone || null,
          customer_email: booking.customer_email || null
        } as BookingWithCustomerDetails;
      }) || [];
      
      console.log('Processed merchant bookings:', processedBookings);
      setBookings(processedBookings);
    } catch (error: any) {
      console.error('Error fetching merchant bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchBookings();

    if (!merchantId) return;

    // Set up real-time subscription for bookings changes
    const channel = supabase
      .channel('merchant-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `merchant_id=eq.${merchantId}`
        },
        (payload) => {
          console.log('Real-time booking update received by merchant:', payload);
          // Immediately fetch fresh data when any change occurs
          fetchBookings();
        }
      )
      .subscribe((status) => {
        console.log('Merchant real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up merchant real-time subscription');
      supabase.removeChannel(channel);
    };
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
  }, [merchantId]);

  // Filter bookings for the selected day
  const todayBookings = useMemo(() => {
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      return isSameDay(bookingDate, date);
    }).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  }, [bookings, date]);

  // Handle booking status change
  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    console.log('Merchant updating booking status:', bookingId, 'to:', newStatus);
    
    try {
      // Update the booking status in the database
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
        
      if (error) {
        console.error('Merchant booking status update error:', error);
        throw error;
      }
      
      console.log('Merchant booking status updated successfully');
      
      toast({
        title: "Success",
        description: `Booking ${newStatus} successfully.`,
      });

      // Force refresh bookings to get the latest data
      await fetchBookings();
    } catch (error: any) {
      console.error('Error updating merchant booking status:', error);
      toast({
        title: "Error",
        description: "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Holiday management functions
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

  const removeCurrentHolidayDate = () => {
    const holiday = holidays.find(h => 
      isSameDay(parseISO(h.holiday_date), date)
    );
    if (holiday) {
      deleteHolidayDate(holiday.id);
    }
  };

  const holidayDates = holidays.map(h => parseISO(h.holiday_date));

  // Check if a date is a holiday
  const isHoliday = (checkDate: Date) => {
    return holidayDates.some(holiday => isSameDay(holiday, checkDate));
  };

  // Get the number of bookings for a day
  const getBookingsCountForDay = (day: Date) => {
    return bookings.filter(b => isSameDay(parseISO(b.date), day)).length;
  };

  // Handle availability change
  const handleAvailabilityChange = () => {
    fetchBookings();
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-booqit-dark">Calendar Management</h1>
      </div>
      
      {/* Calendar View */}
      <Card className="mb-4 overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-r from-booqit-primary/5 to-booqit-primary/10 py-2">
          <CalendarNavigation
            date={date}
            onDateChange={setDate}
            isMobile={isMobile}
            isHoliday={isHoliday}
            holidayDialogOpen={holidayDialogOpen}
            setHolidayDialogOpen={setHolidayDialogOpen}
            holidayDescription={holidayDescription}
            setHolidayDescription={setHolidayDescription}
            onAddHoliday={addHolidayDate}
            onRemoveHoliday={removeCurrentHolidayDate}
          />
        </CardHeader>
        
        <CardContent className="p-0">
          <CalendarDays
            visibleDays={visibleDays}
            currentDate={new Date()}
            selectedDate={date}
            onDateSelect={setDate}
            isHoliday={isHoliday}
            getBookingsCountForDay={getBookingsCountForDay}
          />
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Bookings */}
        <div className="lg:col-span-2">
          <BookingsList
            date={date}
            bookings={todayBookings}
            isLoading={isLoading}
            onStatusChange={handleStatusChange}
          />
        </div>
        
        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Stylist Availability Widget */}
          {merchantId && (
            <StylistAvailabilityWidget 
              merchantId={merchantId}
              selectedDate={date}
              onAvailabilityChange={handleAvailabilityChange}
            />
          )}
          
          {/* Shop Holidays */}
          <HolidayManager
            holidays={holidays}
            isLoading={isHolidayLoading}
            onDeleteHoliday={deleteHolidayDate}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarManagementPage;
