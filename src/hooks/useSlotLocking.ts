
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SlotLockResult {
  success: boolean;
  error?: string;
  expires_at?: string;
}

export const useSlotLocking = () => {
  const [isLocking, setIsLocking] = useState(false);
  const [lockedSlot, setLockedSlot] = useState<{
    staffId: string;
    date: string;
    timeSlot: string;
  } | null>(null);

  const lockSlot = useCallback(async (
    staffId: string,
    date: string,
    timeSlot: string,
    totalDuration: number = 30 // Add total duration parameter
  ): Promise<boolean> => {
    setIsLocking(true);
    
    try {
      console.log('SLOT_LOCKING: Attempting to lock slot with total duration:', { 
        staffId, 
        date, 
        timeSlot, 
        totalDuration 
      });
      
      // Check if the slot is available using the total duration
      const { data: slotsData } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: staffId.split('-')[0], // Quick way to get merchant ID from staff ID
        p_date: date,
        p_staff_id: staffId,
        p_service_duration: totalDuration // Use total duration instead of default 30
      });
      
      const availableSlots = Array.isArray(slotsData) ? slotsData : [];
      const isSlotAvailable = availableSlots.some(slot => 
        slot.staff_id === staffId && 
        slot.time_slot === timeSlot && 
        slot.is_available
      );
      
      if (!isSlotAvailable) {
        console.log('SLOT_LOCKING: Slot not available for total duration:', { 
          staffId, 
          date, 
          timeSlot, 
          totalDuration 
        });
        toast.error(`This time slot is not available for ${totalDuration} minutes`);
        return false;
      }

      // Just keep track of the slot locally without creating a pending booking
      setLockedSlot({ staffId, date, timeSlot });
      toast.success(`Slot selected for ${totalDuration} minutes`);
      return true;
      
    } catch (error) {
      console.error('Error in lockSlot:', error);
      toast.error('Failed to select slot. Please try again.');
      return false;
    } finally {
      setIsLocking(false);
    }
  }, []);

  const releaseLock = useCallback(() => {
    // Clear the local state
    setLockedSlot(null);
  }, []);

  return {
    lockSlot,
    releaseLock,
    isLocking,
    lockedSlot
  };
};
