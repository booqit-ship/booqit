
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
  totalDuration: number; // Total duration of all selected services
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
      console.log('Fetching slots for duration:', totalDuration, 'minutes');
      
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
        console.error('Error fetching slots:', slotsError);
        setError('Failed to fetch available slots');
        return;
      }

      const slots = Array.isArray(slotsData) ? slotsData : [];
      console.log('Raw slots from database:', slots.length);

      // Filter slots for full duration availability
      const validSlots = filterSlotsForFullDuration(slots, totalDuration);
      console.log('Slots valid for', totalDuration, 'minutes:', validSlots.length);

      // Apply today's time buffer if needed
      const finalSlots = isTodayIST(selectedDate) 
        ? filterSlotsForToday(validSlots, selectedDate)
        : validSlots;

      setAvailableSlots(finalSlots);
      setLastRefreshTime(new Date());

    } catch (error) {
      console.error('Error in fetchAvailableSlots:', error);
      setError('Failed to load available slots');
      toast.error('Failed to load available slots');
    } finally {
      setLoading(false);
    }
  }, [merchantId, selectedDate, selectedStaff, totalDuration]);

  // Filter slots to ensure full duration is available
  const filterSlotsForFullDuration = (slots: AvailableSlot[], duration: number): AvailableSlot[] => {
    if (duration <= 10) {
      // For 10 minutes or less, just return available slots
      return slots.filter(slot => slot.is_available);
    }

    const slotsNeeded = Math.ceil(duration / 10); // Number of 10-minute slots needed
    const availableSlots = slots.filter(slot => slot.is_available);
    const validStartSlots: AvailableSlot[] = [];

    // Group slots by staff_id for processing
    const slotsByStaff = availableSlots.reduce((acc, slot) => {
      if (!acc[slot.staff_id]) acc[slot.staff_id] = [];
      acc[slot.staff_id].push(slot);
      return acc;
    }, {} as Record<string, AvailableSlot[]>);

    // Check each staff's slots
    Object.entries(slotsByStaff).forEach(([staffId, staffSlots]) => {
      // Sort slots by time
      const sortedSlots = staffSlots.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
      
      sortedSlots.forEach((startSlot, index) => {
        // Check if we have enough consecutive slots
        let canBook = true;
        const requiredSlots = [startSlot];

        for (let i = 1; i < slotsNeeded; i++) {
          const nextSlotTime = addMinutesToTimeSlot(startSlot.time_slot, i * 10);
          const nextSlot = sortedSlots.find(s => s.time_slot === nextSlotTime);
          
          if (!nextSlot || !nextSlot.is_available) {
            canBook = false;
            break;
          }
          requiredSlots.push(nextSlot);
        }

        if (canBook) {
          validStartSlots.push(startSlot);
        }
      });
    });

    return validStartSlots;
  };

  // Add minutes to a time slot string (HH:MM format)
  const addMinutesToTimeSlot = (timeSlot: string, minutes: number): string => {
    const [hours, mins] = timeSlot.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  // Filter slots based on current time buffer for today
  const filterSlotsForToday = (slots: AvailableSlot[], selectedDate: Date): AvailableSlot[] => {
    const currentTimeWithBuffer = getCurrentTimeISTWithBuffer(40); // 40 minutes buffer
    
    return slots.filter(slot => {
      if (!slot.is_available) return true; // Keep unavailable slots for display
      return slot.time_slot >= currentTimeWithBuffer;
    });
  };

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  const refreshSlots = useCallback(() => {
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
