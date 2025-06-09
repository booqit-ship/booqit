
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
    merchantId: string;
    staffId: string;
    date: string;
    timeSlot: string;
    totalDuration: number;
  } | null>(null);

  const lockSlot = useCallback(async (
    merchantId: string,
    staffId: string,
    date: string,
    timeSlot: string,
    totalDuration: number
  ): Promise<boolean> => {
    setIsLocking(true);
    
    try {
      console.log('SLOT_LOCK: Starting slot lock with parameters:', { 
        merchantId,
        staffId, 
        date, 
        timeSlot, 
        totalDuration,
        merchantIdType: typeof merchantId,
        staffIdType: typeof staffId,
        dateType: typeof date,
        timeSlotType: typeof timeSlot,
        totalDurationType: typeof totalDuration
      });

      // Validate inputs
      if (!merchantId || typeof merchantId !== 'string') {
        console.error('SLOT_LOCK: Invalid merchantId:', merchantId);
        toast.error('Invalid merchant selection. Please try again.');
        return false;
      }

      if (!staffId || typeof staffId !== 'string') {
        console.error('SLOT_LOCK: Invalid staffId:', staffId);
        toast.error('Invalid staff selection. Please try again.');
        return false;
      }

      if (!date || typeof date !== 'string') {
        console.error('SLOT_LOCK: Invalid date:', date);
        toast.error('Invalid date selection. Please try again.');
        return false;
      }

      if (!timeSlot || typeof timeSlot !== 'string') {
        console.error('SLOT_LOCK: Invalid timeSlot:', timeSlot);
        toast.error('Invalid time slot selection. Please try again.');
        return false;
      }

      if (!totalDuration || typeof totalDuration !== 'number' || totalDuration <= 0) {
        console.error('SLOT_LOCK: Invalid totalDuration:', totalDuration);
        toast.error('Invalid service duration. Please try again.');
        return false;
      }

      // Validate UUID formats
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (!uuidPattern.test(merchantId)) {
        console.error('SLOT_LOCK: Invalid merchant ID format:', merchantId);
        toast.error('Invalid merchant information. Please try again.');
        return false;
      }

      if (!uuidPattern.test(staffId)) {
        console.error('SLOT_LOCK: Invalid staff ID format:', staffId);
        toast.error('Invalid staff information. Please try again.');
        return false;
      }

      // Validate date format (YYYY-MM-DD)
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(date)) {
        console.error('SLOT_LOCK: Invalid date format:', date);
        toast.error('Invalid date format. Please try again.');
        return false;
      }

      // Normalize timeSlot to HH:mm format if needed
      const normalizedTimeSlot = timeSlot.includes(':') ? timeSlot.substring(0, 5) : timeSlot;
      console.log('SLOT_LOCK: Normalized timeSlot:', normalizedTimeSlot);

      console.log('SLOT_LOCK: Calling RPC with validated parameters:', {
        p_merchant_id: merchantId,
        p_date: date,
        p_staff_id: staffId,
        p_service_duration: totalDuration
      });
      
      // Call the RPC function with detailed error handling
      const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: merchantId,
        p_date: date,
        p_staff_id: staffId,
        p_service_duration: totalDuration
      });
      
      if (slotsError) {
        console.error('SLOT_LOCK: RPC Error Details:', {
          error: slotsError,
          message: slotsError.message,
          details: slotsError.details,
          hint: slotsError.hint,
          code: slotsError.code,
          parameters: {
            p_merchant_id: merchantId,
            p_date: date,
            p_staff_id: staffId,
            p_service_duration: totalDuration
          }
        });
        
        // More specific error messages based on error type
        if (slotsError.message?.includes('permission denied')) {
          toast.error('Permission denied. Please check your login status.');
        } else if (slotsError.message?.includes('function') && slotsError.message?.includes('does not exist')) {
          toast.error('Booking system is temporarily unavailable. Please try again later.');
        } else if (slotsError.message?.includes('invalid input')) {
          toast.error('Invalid booking information. Please refresh and try again.');
        } else {
          toast.error(`Unable to check slot availability: ${slotsError.message || 'Unknown error'}`);
        }
        return false;
      }
      
      console.log('SLOT_LOCK: RPC Success - Raw data:', {
        slotsData,
        slotsCount: Array.isArray(slotsData) ? slotsData.length : 0,
        duration: totalDuration
      });
      
      const availableSlots = Array.isArray(slotsData) ? slotsData : [];
      console.log('SLOT_LOCK: Processed slots:', availableSlots.length, 'slots available for', totalDuration, 'minutes');
      
      // Find the specific slot for this time and staff
      const targetSlot = availableSlots.find(slot => {
        const slotTimeSlot = typeof slot.time_slot === 'string' 
          ? slot.time_slot.substring(0, 5) 
          : slot.time_slot;
        
        return slot.staff_id === staffId && 
               slotTimeSlot === normalizedTimeSlot && 
               slot.is_available === true;
      });
      
      console.log('SLOT_LOCK: Target slot search:', {
        normalizedTimeSlot,
        staffId,
        totalDuration,
        targetSlot,
        availableSlotsForStaff: availableSlots
          .filter(s => s.staff_id === staffId)
          .map(s => ({ 
            time_slot: typeof s.time_slot === 'string' ? s.time_slot.substring(0, 5) : s.time_slot,
            is_available: s.is_available, 
            conflict_reason: s.conflict_reason 
          }))
      });
      
      if (!targetSlot) {
        console.log('SLOT_LOCK: Slot not available:', { 
          requestedStaffId: staffId, 
          requestedTimeSlot: normalizedTimeSlot, 
          totalDuration,
          availableSlotsForStaff: availableSlots
            .filter(s => s.staff_id === staffId)
            .map(s => ({ 
              time_slot: typeof s.time_slot === 'string' ? s.time_slot.substring(0, 5) : s.time_slot,
              is_available: s.is_available, 
              conflict_reason: s.conflict_reason 
            })),
          allSlotsForTime: availableSlots
            .filter(s => {
              const slotTimeSlot = typeof s.time_slot === 'string' 
                ? s.time_slot.substring(0, 5) 
                : s.time_slot;
              return slotTimeSlot === normalizedTimeSlot;
            })
            .map(s => ({
              staff_id: s.staff_id,
              is_available: s.is_available,
              conflict_reason: s.conflict_reason
            }))
        });
        
        // Find any slot for this time to get specific error
        const conflictSlot = availableSlots.find(slot => {
          const slotTimeSlot = typeof slot.time_slot === 'string' 
            ? slot.time_slot.substring(0, 5) 
            : slot.time_slot;
          return slotTimeSlot === normalizedTimeSlot && slot.staff_id === staffId;
        });
        
        const errorMsg = conflictSlot?.conflict_reason 
          ? `This time slot is not available: ${conflictSlot.conflict_reason}`
          : `This time slot is not available for ${totalDuration} minutes`;
        
        toast.error(errorMsg);
        return false;
      }

      // Store the slot locally with correct total duration
      setLockedSlot({ merchantId, staffId, date, timeSlot: normalizedTimeSlot, totalDuration });
      console.log('SLOT_LOCK: Successfully locked slot for', totalDuration, 'minutes:', {
        merchantId,
        staffId,
        date,
        timeSlot: normalizedTimeSlot,
        totalDuration
      });
      toast.success(`Slot selected for ${totalDuration} minutes`);
      return true;
      
    } catch (error) {
      console.error('SLOT_LOCK: Catch block error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
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
