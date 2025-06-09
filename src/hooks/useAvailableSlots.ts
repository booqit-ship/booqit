
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateInIST, isTodayIST, getCurrentTimeISTWithBuffer } from '@/utils/dateUtils';

export interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason: string | null;
}

interface UseAvailableSlotsProps {
  merchantId: string;
  selectedDate: Date | null;
  selectedStaff: string | null;
  totalDuration: number;
}

export const useAvailableSlots = ({
  merchantId,
  selectedDate,
  selectedStaff,
  totalDuration
}: UseAvailableSlotsProps) => {
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

  const fetchAvailableSlots = useCallback(async () => {
    if (!merchantId || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 Fetching slots with improved duration filtering:', {
        duration: totalDuration,
        date: formatDateInIST(selectedDate, 'yyyy-MM-dd')
      });
      
      const dateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      
      // Get all available slots for the date
      const { data: slotsData, error: slotsError } = await supabase.rpc(
        'get_available_slots_with_ist_buffer',
        {
          p_merchant_id: merchantId,
          p_date: dateStr,
          p_staff_id: selectedStaff,
          p_service_duration: totalDuration
        }
      );

      if (slotsError) {
        console.error('❌ Error fetching slots:', slotsError);
        setError('Failed to fetch available slots');
        return;
      }

      const slots = Array.isArray(slotsData) ? slotsData : [];
      console.log('📊 Raw slots from database:', slots.length);

      // Enhanced filtering for full duration availability
      const validSlots = filterSlotsForFullDurationImproved(slots, totalDuration, selectedDate);
      console.log('✅ Valid slots for', totalDuration, 'minutes:', validSlots.length);

      setAvailableSlots(validSlots);
      setLastRefreshTime(new Date());

    } catch (error) {
      console.error('❌ Error in fetchAvailableSlots:', error);
      setError('Failed to load available slots');
      toast.error('Failed to load available slots');
    } finally {
      setLoading(false);
    }
  }, [merchantId, selectedDate, selectedStaff, totalDuration]);

  // Improved filtering logic with better continuous availability checking
  const filterSlotsForFullDurationImproved = (
    slots: AvailableSlot[], 
    duration: number, 
    selectedDate: Date
  ): AvailableSlot[] => {
    if (duration <= 10) {
      // For single slots, just return available ones
      return slots.filter(slot => slot.is_available);
    }

    const slotsNeeded = Math.ceil(duration / 10);
    const availableSlots = slots.filter(slot => slot.is_available);
    const validStartSlots: AvailableSlot[] = [];

    // Group by staff for more efficient processing
    const slotsByStaff = availableSlots.reduce((acc, slot) => {
      if (!acc[slot.staff_id]) acc[slot.staff_id] = [];
      acc[slot.staff_id].push(slot);
      return acc;
    }, {} as Record<string, AvailableSlot[]>);

    // Check each staff's slots for continuous availability
    Object.entries(slotsByStaff).forEach(([staffId, staffSlots]) => {
      // Sort slots by time to ensure proper sequence checking
      const sortedSlots = staffSlots.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
      
      sortedSlots.forEach((startSlot, index) => {
        // Check if we have enough consecutive slots starting from this one
        let hasFullDuration = true;
        const requiredSlots = [startSlot];

        for (let i = 1; i < slotsNeeded; i++) {
          const expectedTime = addMinutesToTimeSlot(startSlot.time_slot, i * 10);
          const nextSlot = sortedSlots.find(s => s.time_slot === expectedTime && s.is_available);
          
          if (!nextSlot) {
            hasFullDuration = false;
            break;
          }
          requiredSlots.push(nextSlot);
        }

        if (hasFullDuration) {
          // Double-check that the slots are truly consecutive in our array
          const allConsecutive = requiredSlots.every((slot, idx) => {
            if (idx === 0) return true;
            const prevTime = requiredSlots[idx - 1].time_slot;
            const expectedTime = addMinutesToTimeSlot(prevTime, 10);
            return slot.time_slot === expectedTime;
          });

          if (allConsecutive) {
            validStartSlots.push(startSlot);
          }
        }
      });
    });

    // Apply today's buffer filtering if needed
    if (isTodayIST(selectedDate)) {
      return filterSlotsForToday(validStartSlots, selectedDate);
    }

    return validStartSlots;
  };

  // Helper function to add minutes to time slot
  const addMinutesToTimeSlot = (timeSlot: string, minutes: number): string => {
    const [hours, mins] = timeSlot.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  // Filter slots based on current time buffer for today
  const filterSlotsForToday = (slots: AvailableSlot[], selectedDate: Date): AvailableSlot[] => {
    const currentTimeWithBuffer = getCurrentTimeISTWithBuffer(40);
    
    return slots.filter(slot => {
      if (!slot.is_available) return true;
      return slot.time_slot >= currentTimeWithBuffer;
    });
  };

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  const refreshSlots = useCallback(() => {
    console.log('🔄 Refreshing slots after booking attempt...');
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  return {
    availableSlots,
    loading,
    error,
    lastRefreshTime,
    refreshSlots
  };
};
