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
  stylist_name?: string;
}

interface HolidayDate {
  id: string;
  holiday_date: string;
  description: string | null;
}

interface BookingStatusResponse {
  success: boolean;
  error?: string;
  message?: string;
  slots_released?: number;
  booking?: {
    id: string;
    status: string;
    updated_at: string;
  };
}

const CalendarManagementPage: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<BookingWithCustomerDetails[]>([]);
  const [holidays, setHolidays] = useState<HolidayDate[]>([]);
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
        console.log('Merchant ID fetched:', data.id);
      } catch (error) {
        console.error('Error fetching merchant ID:', error);
      }
    };
    
    fetchMerchantId();
  }, [userId]);

  // Generate slots for visible days when merchant ID is available
  useEffect(() => {
    const generateSlotsForVisibleDays = async () => {
      if (!merchantId) return;

      try {
        console.log('Generating slots for visible days');
        
        // Generate slots for each visible day
        for (const day of visibleDays) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const { error } = await supabase.rpc('generate_stylist_slots', {
            p_merchant_id: merchantId,
            p_date: dateStr
          });
          
          if (error) {
            console.error(`Error generating slots for ${dateStr}:`, error);
          }
        }
      } catch (error) {
        console.error('Error generating slots for visible days:', error);
      }
    };

    generateSlotsForVisibleDays();
  }, [merchantId, visibleDays]);

  // Fetch bookings for the merchant with customer details and stylist names
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
          )
        `)
        .eq('merchant_id', merchantId)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });
      
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }
      
      console.log('Merchant bookings fetched successfully:', bookingsData?.length || 0, 'bookings');
      
      const processedBookings = bookingsData?.map((booking) => ({
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
        customer_name: booking.customer_name || 'Walk-in Customer',
        customer_phone: booking.customer_phone || null,
        customer_email: booking.customer_email || null,
        stylist_name: booking.stylist_name || 'Unassigned'
      } as BookingWithCustomerDetails)) || [];
      
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

  // Set up real-time subscription for bookings
  useEffect(() => {
    fetchBookings();

    if (!merchantId) return;

    console.log('Setting up real-time subscription for merchant bookings');
    
    const channel = supabase
      .channel(`merchant-bookings-${merchantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `merchant_id=eq.${merchantId}`
        },
        (payload) => {
          console.log('Real-time booking update received:', payload);
          fetchBookings();
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
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

  // Handle booking status change using the new database function
  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    console.log('Updating booking status:', bookingId, 'to:', newStatus);
    
    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the new function that handles both status updates and slot releases
      const { data, error } = await supabase.rpc('update_booking_status_and_release_slots', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_merchant_user_id: userId
      });

      if (error) {
        console.error('Update booking status error:', error);
        throw error;
      }

      const result = data as unknown as BookingStatusResponse;
      if (!result.success) {
        throw new Error(result.error || 'Failed to update booking');
      }

      console.log('Booking status updated successfully:', result);
      
      let message = result.message || `Booking ${newStatus} successfully.`;
      if (newStatus === 'cancelled' && result.slots_released) {
        message += ` (${result.slots_released} slots released)`;
      }

      toast({
        title: "Success",
        description: message,
      });

      // The real-time subscription will automatically refresh the data
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update booking. Please try again.",
        variant: "destructive",
      });
      throw error;
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

  // Handle holiday added callback
  const handleHolidayAdded = () => {
    // Refetch holidays after adding a new one
    const fetchHolidays = async () => {
      if (!merchantId) return;
      
      try {
        const { data, error } = await supabase
          .from('shop_holidays')
          .select('*')
          .eq('merchant_id', merchantId);
          
        if (error) throw error;
        
        setHolidays(data);
      } catch (error: any) {
        console.error('Error fetching holidays:', error);
      }
    };
    
    fetchHolidays();
  };

  // Handle holiday deletion
  const handleDeleteHoliday = async (holidayId: string) => {
    try {
      const { error } = await supabase
        .from('shop_holidays')
        .delete()
        .eq('id', holidayId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Holiday deleted successfully.",
      });

      // Refresh holidays list
      handleHolidayAdded();
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete holiday. Please try again.",
        variant: "destructive",
      });
    }
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
            isHoliday={() => false}
            holidayDialogOpen={false}
            setHolidayDialogOpen={() => {}}
            holidayDescription=""
            setHolidayDescription={() => {}}
            onAddHoliday={() => {}}
            onRemoveHoliday={() => {}}
          />
        </CardHeader>
        
        <CardContent className="p-0">
          <CalendarDays
            visibleDays={visibleDays}
            currentDate={new Date()}
            selectedDate={date}
            onDateSelect={setDate}
            isHoliday={() => false}
            getBookingsCountForDay={() => 0}
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
              onAvailabilityChange={() => {}}
            />
          )}
          
          {/* Shop Holidays */}
          {merchantId && (
            <HolidayManager
              holidays={holidays}
              isLoading={isHolidayLoading}
              onDeleteHoliday={() => {}}
              onHolidayAdded={() => {}}
              merchantId={merchantId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarManagementPage;
