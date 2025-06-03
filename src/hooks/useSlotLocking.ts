
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
      
      // Use direct RPC call with proper casting
      const { data, error } = await supabase.rpc('create_slot_lock' as any, {
        p_staff_id: staffId,
        p_date: date,
        p_time_slot: timeSlot,
        p_lock_duration_minutes: 10
      });

      if (error) {
        console.error('Error locking slot:', error);
        toast.error('Failed to reserve slot. Please try again.');
        return false;
      }

      const result = data as unknown as SlotLockResult;
      
      if (!result.success) {
        console.log('Slot lock failed:', result.error);
        toast.error(result.error || 'Slot is not available');
        return false;
      }

      console.log('Slot locked successfully:', result);
      setLockedSlot({ staffId, date, timeSlot });
      toast.success('Slot reserved for 10 minutes');
      return true;
      
    } catch (error) {
      console.error('Error in lockSlot:', error);
      toast.error('Failed to reserve slot. Please try again.');
      return false;
    } finally {
      setIsLocking(false);
    }
  }, []);

  const releaseLock = useCallback(async (
    staffId?: string,
    date?: string,
    timeSlot?: string
  ) => {
    const lockToRelease = lockedSlot || (staffId && date && timeSlot ? { staffId, date, timeSlot } : null);
    
    if (!lockToRelease) return;

    try {
      console.log('Releasing slot lock:', lockToRelease);
      
      // Use direct RPC call with proper casting
      const { error } = await supabase.rpc('release_slot_lock' as any, {
        p_staff_id: lockToRelease.staffId,
        p_date: lockToRelease.date,
        p_time_slot: lockToRelease.timeSlot
      });

      if (error) {
        console.error('Error releasing lock:', error);
      } else {
        console.log('Lock released successfully');
        setLockedSlot(null);
      }
    } catch (error) {
      console.error('Error in releaseLock:', error);
    }
  }, [lockedSlot]);

  return {
    lockSlot,
    releaseLock,
    isLocking,
    lockedSlot
  };
};
