
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
    totalDuration: number;
  } | null>(null);

  const lockSlot = useCallback(async (
    staffId: string,
    date: string,
    timeSlot: string,
    totalDuration: number
  ): Promise<boolean> => {
    setIsLocking(true);
    
    try {
      console.log('SLOT_LOCK: Attempting to lock slot with total duration:', { 
        staffId, 
        date, 
        timeSlot, 
        totalDuration 
      });
      
      // CRITICAL FIX: Use the correct total duration for slot checking
      const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: staffId.split('-')[0], // Extract merchant ID from staff ID
        p_date: date,
        p_staff_id: staffId,
        p_service_duration: totalDuration // Use the passed total duration
      });
      
      if (slotsError) {
        console.error('SLOT_LOCK: RPC Error:', slotsError);
        toast.error('Failed to check slot availability. Please try again.');
        return false;
      }
      
      const availableSlots = Array.isArray(slotsData) ? slotsData : [];
      console.log('SLOT_LOCK: Got', availableSlots.length, 'slots for duration check');
      
      const isSlotAvailable = availableSlots.some(slot => 
        slot.staff_id === staffId && 
        slot.time_slot === timeSlot && 
        slot.is_available
      );
      
      if (!isSlotAvailable) {
        console.log('SLOT_LOCK: Slot not available for total duration:', { 
          staffId, 
          date, 
          timeSlot, 
          totalDuration 
        });
        toast.error(`This time slot is not available for ${totalDuration} minutes`);
        return false;
      }

      // Store the slot locally with correct total duration
      setLockedSlot({ staffId, date, timeSlot, totalDuration });
      console.log('SLOT_LOCK: Successfully locked slot for', totalDuration, 'minutes');
      toast.success(`Slot selected for ${totalDuration} minutes`);
      return true;
      
    } catch (error) {
      console.error('SLOT_LOCK: Catch error:', error);
      toast.error('Failed to select slot. Please try again.');
      return false;
    } finally {
      setIsLocking(false);
    }
  }, []);

  const releaseLock = useCallback(() => {
    console.log('SLOT_LOCK: Releasing lock for slot:', lockedSlot);
    setLockedSlot(null);
  }, [lockedSlot]);

  return {
    lockSlot,
    releaseLock,
    isLocking,
    lockedSlot
  };
};
