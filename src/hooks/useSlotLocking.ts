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
    timeSlot: string
  ): Promise<boolean> => {
    setIsLocking(true);
    
    try {
      console.log('Attempting to lock slot:', { staffId, date, timeSlot });
      
      // Check if the slot is available without creating a pending booking
      const { data: slotsData } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: staffId.split('-')[0], // Quick way to get merchant ID from staff ID
        p_date: date,
        p_staff_id: staffId,
        p_service_duration: 30 // Default assumption
      });
      
      const availableSlots = Array.isArray(slotsData) ? slotsData : [];
      const isSlotAvailable = availableSlots.some(slot => 
        slot.staff_id === staffId && 
        slot.time_slot === timeSlot && 
        slot.is_available
      );
      
      if (!isSlotAvailable) {
        console.log('Slot not available:', { staffId, date, timeSlot });
        toast.error('This time slot is no longer available');
        return false;
      }

      // Just keep track of the slot locally without creating a pending booking
      setLockedSlot({ staffId, date, timeSlot });
      toast.success('Slot selected');
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
    // Just clear the local state
    setLockedSlot(null);
  }, []);

  return {
    lockSlot,
    releaseLock,
    isLocking,
    lockedSlot
  };
};
