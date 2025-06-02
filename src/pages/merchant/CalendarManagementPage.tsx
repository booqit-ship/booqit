
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import BookingsList from '@/components/merchant/calendar/BookingsList';
import HolidayManager from '@/components/merchant/calendar/HolidayManager';
import WeekCalendar from '@/components/merchant/calendar/WeekCalendar';
import StylistAvailabilityWidget from '@/components/merchant/StylistAvailabilityWidget';
import { useCalendarData } from '@/hooks/useCalendarData';

const CalendarManagementPage: React.FC = () => {
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const {
    bookings,
    loading,
    merchantId,
    holidays,
    holidaysLoading,
    fetchBookings,
    fetchHolidays,
    handleDeleteHoliday,
  } = useCalendarData(userId, selectedDate);

  // Generate week days (5 weekdays only)
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase.rpc('update_booking_status_with_slot_management', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_user_id: userId
      });

      if (error) {
        console.error('Error updating booking status:', error);
        toast.error('Failed to update booking status');
        return;
      }

      toast.success(`Booking ${newStatus} successfully`);
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = addDays(weekStart, direction === 'next' ? 5 : -5);
    setWeekStart(newWeekStart);
    if (!weekDays.some(day => isSameDay(day, selectedDate))) {
      setSelectedDate(newWeekStart);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
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
          <h1 className="text-2xl md:text-3xl font-bold">Calendar Management</h1>
        </div>
        <p className="text-muted-foreground">Manage your bookings and appointments</p>
      </div>

      <WeekCalendar
        weekDays={weekDays}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        onNavigateWeek={navigateWeek}
        onGoToToday={goToToday}
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
