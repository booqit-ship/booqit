
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addDays, subDays, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import BookingsList from '@/components/merchant/calendar/BookingsList';
import HolidayManager from '@/components/merchant/calendar/HolidayManager';
import WeekCalendar from '@/components/merchant/calendar/WeekCalendar';
import StylistAvailabilityWidget from '@/components/merchant/StylistAvailabilityWidget';
import { useCalendarData } from '@/hooks/useCalendarData';
import { formatDateInIST, getCurrentDateIST } from '@/utils/dateUtils';

const CalendarManagementPage: React.FC = () => {
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentDateIST());
  const [appointmentCounts, setAppointmentCounts] = useState<{
    [date: string]: number;
  }>({});

  const {
    bookings,
    loading,
    merchantId,
    holidays,
    holidaysLoading,
    fetchBookings,
    fetchHolidays,
    handleDeleteHoliday
  } = useCalendarData(userId, selectedDate);

  // Generate visible days based on selected date
  const getVisibleDays = (baseDate: Date) => {
    const today = new Date();
    const isBaseToday = isSameDay(baseDate, today);
    
    if (isBaseToday) {
      return Array.from({ length: 5 }, (_, i) => addDays(today, i));
    } else {
      return Array.from({ length: 5 }, (_, i) => addDays(baseDate, i - 2));
    }
  };

  const visibleDays = React.useMemo(() => getVisibleDays(selectedDate), [selectedDate]);

  // Fetch appointment counts for visible days
  React.useEffect(() => {
    const fetchAppointmentCounts = async () => {
      if (!merchantId) return;
      const counts: { [date: string]: number } = {};
      
      for (const day of visibleDays) {
        const dateStr = formatDateInIST(day, 'yyyy-MM-dd');
        try {
          const { count, error } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('merchant_id', merchantId)
            .eq('date', dateStr)
            .neq('status', 'cancelled');
          
          if (!error) {
            counts[dateStr] = count || 0;
          }
        } catch (error) {
          console.error('Error fetching appointment count for', dateStr, error);
        }
      }
      setAppointmentCounts(counts);
    };

    fetchAppointmentCounts();
  }, [merchantId, visibleDays]);

  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      console.log('Updating booking status:', bookingId, 'to:', newStatus);
      const { data, error } = await supabase.rpc('update_booking_status_with_slot_management', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_user_id: userId
      });

      if (error) {
        console.error('Error updating booking status:', error);
        if (error.message.includes('not found')) {
          toast.error('Booking not found');
        } else if (error.message.includes('unauthorized')) {
          toast.error('You are not authorized to update this booking');
        } else {
          toast.error(`Failed to update booking status: ${error.message}`);
        }
        return;
      }

      console.log('Booking status update response:', data);
      const result = data as any;
      if (result && !result.success) {
        toast.error(result.error || 'Failed to update booking status');
        return;
      }

      toast.success(`Booking ${newStatus} successfully`);
      fetchBookings();

      // Refresh appointment counts for the selected date
      const dateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('date', dateStr)
        .neq('status', 'cancelled');
      
      setAppointmentCounts(prev => ({
        ...prev,
        [dateStr]: count || 0
      }));
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status. Please try again.');
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      setSelectedDate(addDays(selectedDate, 1));
    } else {
      setSelectedDate(subDays(selectedDate, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(getCurrentDateIST());
  };

  if (!merchantId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="h-6 w-6 text-booqit-primary" />
          <h1 className="md:text-3xl text-2xl font-light">Calendar Management</h1>
        </div>
        <p className="text-muted-foreground">Manage your bookings and appointments (IST)</p>
      </div>

      <WeekCalendar 
        selectedDate={selectedDate} 
        onDateSelect={setSelectedDate} 
        onNavigateDay={navigateDay} 
        onGoToToday={goToToday} 
        appointmentCounts={appointmentCounts}
        holidays={holidays}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <BookingsList 
            date={selectedDate} 
            bookings={bookings} 
            isLoading={loading} 
            onStatusChange={handleStatusChange} 
          />
        </div>

        <div className="space-y-4 md:space-y-6">
          <HolidayManager 
            merchantId={merchantId} 
            holidays={holidays} 
            isLoading={holidaysLoading} 
            onDeleteHoliday={handleDeleteHoliday} 
            onHolidayAdded={fetchHolidays} 
          />

          <StylistAvailabilityWidget 
            merchantId={merchantId} 
            selectedDate={selectedDate} 
            onAvailabilityChange={() => {
              fetchBookings();
              fetchHolidays();
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarManagementPage;
