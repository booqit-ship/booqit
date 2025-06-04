
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRealtimeSlotsProps {
  selectedDate: Date | null;
  selectedStaff: string | null;
  merchantId: string;
  onSlotChange: () => void;
  selectedTime: string;
  onSelectedTimeInvalidated: () => void;
}

export const useRealtimeSlots = ({
  selectedDate,
  selectedStaff,
  merchantId,
  onSlotChange,
  selectedTime,
  onSelectedTimeInvalidated
}: UseRealtimeSlotsProps) => {
  
  const handleBookingChange = useCallback((payload: any) => {
    console.log('Booking change detected:', payload);
    
    const booking = payload.new || payload.old;
    if (!booking || !selectedDate) return;
    
    // Check if the change affects the current view
    const bookingDate = new Date(booking.date);
    const currentViewDate = selectedDate;
    
    if (bookingDate.toDateString() === currentViewDate.toDateString()) {
      // If selected staff matches or no specific staff selected
      if (!selectedStaff || booking.staff_id === selectedStaff) {
        console.log('Relevant booking change detected, refreshing slots');
        
        // If the selected time slot is affected, clear it
        if (selectedTime && booking.time_slot === selectedTime) {
          if (payload.eventType === 'INSERT' && booking.status === 'confirmed') {
            toast.info('Selected slot is no longer available due to a recent booking');
            onSelectedTimeInvalidated();
          }
        }
        
        // Refresh slots after a short delay to ensure DB consistency
        setTimeout(() => {
          onSlotChange();
        }, 500);
      }
    }
  }, [selectedDate, selectedStaff, selectedTime, onSlotChange, onSelectedTimeInvalidated]);

  useEffect(() => {
    if (!merchantId || !selectedDate) return;

    console.log('Setting up realtime subscriptions for bookings');
    
    // Subscribe to booking changes
    const bookingChannel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `merchant_id=eq.${merchantId}`
        },
        handleBookingChange
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(bookingChannel);
    };
  }, [merchantId, selectedDate, selectedStaff, handleBookingChange]);
};
