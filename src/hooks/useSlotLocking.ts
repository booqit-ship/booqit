
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateInIST } from '@/utils/dateUtils';

export const useSlotLocking = () => {
  const [isLocking, setIsLocking] = useState(false);

  const lockSlot = async (
    staffId: string,
    dateStr: string,
    timeSlot: string,
    serviceDuration: number
  ): Promise<boolean> => {
    if (isLocking) return false;
    
    setIsLocking(true);
    
    try {
      console.log('🔒 Attempting atomic multi-slot lock:', {
        staffId,
        date: dateStr,
        startTime: timeSlot,
        duration: serviceDuration
      });

      // Use the new atomic multi-slot locking function
      const { data: lockResult, error: lockError } = await supabase.rpc(
        'create_atomic_multi_slot_lock' as any,
        {
          p_staff_id: staffId,
          p_date: dateStr,
          p_start_time: timeSlot,
          p_service_duration: serviceDuration,
          p_lock_duration_minutes: 5 // Lock for 5 minutes
        }
      );

      if (lockError) {
        console.error('❌ Slot locking error:', lockError);
        toast.error('Failed to reserve time slot');
        return false;
      }

      const response = lockResult as { success: boolean; error?: string; slots_locked?: number };
      
      if (!response.success) {
        console.warn('❌ Slot lock failed:', response.error);
        toast.error(response.error || 'Time slot is not available');
        return false;
      }

      console.log('✅ Successfully locked', response.slots_locked, 'slots');
      return true;

    } catch (error) {
      console.error('❌ Error in lockSlot:', error);
      toast.error('Failed to reserve time slot');
      return false;
    } finally {
      setIsLocking(false);
    }
  };

  const releaseSlot = async (
    staffId: string,
    dateStr: string,
    timeSlot: string,
    serviceDuration: number
  ): Promise<boolean> => {
    try {
      console.log('🔓 Releasing atomic multi-slot lock:', {
        staffId,
        date: dateStr,
        startTime: timeSlot,
        duration: serviceDuration
      });

      const { data: releaseResult, error: releaseError } = await supabase.rpc(
        'release_atomic_multi_slot_lock' as any,
        {
          p_staff_id: staffId,
          p_date: dateStr,
          p_start_time: timeSlot,
          p_service_duration: serviceDuration
        }
      );

      if (releaseError) {
        console.error('❌ Slot release error:', releaseError);
        return false;
      }

      const response = releaseResult as { success: boolean; slots_released?: number };
      console.log('✅ Released', response.slots_released, 'slot locks');
      return response.success;

    } catch (error) {
      console.error('❌ Error releasing slot:', error);
      return false;
    }
  };

  return {
    lockSlot,
    releaseSlot,
    isLocking
  };
};
