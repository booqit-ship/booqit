
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
    totalDuration: number = 30
  ): Promise<boolean> => {
    setIsLocking(true);
    
    try {
      console.log('SLOT_LOCKING: Attempting to lock slot with total duration:', { 
        staffId, 
        date, 
        timeSlot, 
        totalDuration 
      });
      
      // Check if the slot is still available using the unified function
      const { data: slotsData } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: staffId.split('-')[0], // Extract merchant ID if embedded
        p_date: date,
        p_staff_id: staffId,
        p_service_duration: totalDuration
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
        toast.error(`This time slot is not available for ${totalDuration} minutes total duration`);
        return false;
      }

      // Track the slot locally for UI feedback
      setLockedSlot({ staffId, date, timeSlot });
      console.log('SLOT_LOCKING: Slot selected successfully');
      return true;
      
    } catch (error) {
      console.error('SLOT_LOCKING: Error in lockSlot:', error);
      toast.error('Failed to select slot. Please try again.');
      return false;
    } finally {
      setIsLocking(false);
    }
  }, []);

  const releaseLock = useCallback(() => {
    setLockedSlot(null);
    console.log('SLOT_LOCKING: Lock released');
  }, []);

  return {
    lockSlot,
    releaseLock,
    isLocking,
    lockedSlot
  };
};
