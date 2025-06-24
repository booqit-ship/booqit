
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateInIST, isTodayIST } from '@/utils/dateUtils';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason: string | null;
}

interface UseUnifiedSlotsProps {
  merchantId: string;
  selectedDate: Date | null;
  selectedStaff: string | null;
  totalDuration: number;
  onSlotChange?: () => void;
}

export const useUnifiedSlots = ({
  merchantId,
  selectedDate,
  selectedStaff,
  totalDuration,
  onSlotChange
}: UseUnifiedSlotsProps) => {
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

  const fetchSlots = useCallback(async () => {
    if (!merchantId || !selectedDate) return;

    setIsLoading(true);
    setError('');
    
    try {
      const dateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      console.log('UNIFIED_SLOTS: Fetching slots for:', { 
        merchantId, 
        dateStr, 
        selectedStaff, 
        totalDuration 
      });

      const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: merchantId,
        p_date: dateStr,
        p_staff_id: selectedStaff || null,
        p_service_duration: totalDuration || 30
      });

      if (slotsError) throw slotsError;

      console.log('UNIFIED_SLOTS: Slots fetched:', slotsData?.length || 0);
      setAvailableSlots(slotsData || []);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('UNIFIED_SLOTS: Error fetching slots:', error);
      setError('Failed to load available time slots');
      toast.error('Failed to load available time slots');
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, selectedDate, selectedStaff, totalDuration]);

  // Real-time slot updates
  useEffect(() => {
    if (!merchantId || !selectedDate) return;

    console.log('UNIFIED_SLOTS: Setting up realtime subscriptions');
    
    const bookingChannel = supabase
      .channel('unified-booking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `merchant_id=eq.${merchantId}`
        },
        (payload) => {
          console.log('UNIFIED_SLOTS: Booking change detected:', payload);
          
          const booking = payload.new || payload.old;
          if (!booking || !selectedDate) return;
          
          const bookingDate = new Date(booking.date);
          const currentViewDate = selectedDate;
          
          if (bookingDate.toDateString() === currentViewDate.toDateString()) {
            if (!selectedStaff || booking.staff_id === selectedStaff) {
              console.log('UNIFIED_SLOTS: Relevant booking change, refreshing slots');
              
              // Refresh slots after a short delay
              setTimeout(() => {
                fetchSlots();
                onSlotChange?.();
              }, 500);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('UNIFIED_SLOTS: Cleaning up realtime subscriptions');
      supabase.removeChannel(bookingChannel);
    };
  }, [merchantId, selectedDate, selectedStaff, fetchSlots, onSlotChange]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Get next valid slot time for today
  const getNextValidSlotTime = useCallback(() => {
    if (!isTodayIST(selectedDate) || availableSlots.length === 0) return null;
    
    const availableSlot = availableSlots.find(slot => slot.is_available);
    return availableSlot?.time_slot || null;
  }, [selectedDate, availableSlots]);

  return {
    availableSlots,
    isLoading,
    error,
    lastRefreshTime,
    nextValidSlotTime: getNextValidSlotTime(),
    refreshSlots: fetchSlots
  };
};
