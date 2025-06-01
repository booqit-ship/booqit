
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';

interface SlotData {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  slot_status: 'Available' | 'Shop Closed' | 'Stylist not available' | 'Booked';
  status_reason: string | null;
}

interface DaySlots {
  date: string;
  displayDate: string;
  slots: SlotData[];
}

export const useSlotGeneration = (merchantId: string, selectedStaff?: string) => {
  const [slots, setSlots] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateThreeDaySlots = async () => {
    if (!merchantId) return;

    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const threeDaySlots: DaySlots[] = [];

      // Generate for exactly 3 days: Today, Tomorrow, Day After Tomorrow
      for (let i = 0; i < 3; i++) {
        const currentDate = addDays(today, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        let displayDate = '';
        if (i === 0) displayDate = 'Today';
        else if (i === 1) displayDate = 'Tomorrow';
        else displayDate = 'Day After Tomorrow';

        console.log(`Fetching slots for ${displayDate} (${dateStr})`);

        const { data: slotData, error: slotError } = await supabase.rpc('get_dynamic_available_slots', {
          p_merchant_id: merchantId,
          p_date: dateStr,
          p_staff_id: selectedStaff || null
        });

        if (slotError) {
          console.error(`Error fetching slots for ${dateStr}:`, slotError);
          throw slotError;
        }

        const formattedSlots: SlotData[] = (slotData || []).map((slot: any) => ({
          staff_id: slot.staff_id,
          staff_name: slot.staff_name,
          time_slot: slot.time_slot,
          slot_status: slot.slot_status as SlotData['slot_status'],
          status_reason: slot.status_reason
        }));

        threeDaySlots.push({
          date: dateStr,
          displayDate,
          slots: formattedSlots
        });
      }

      setSlots(threeDaySlots);
      console.log('Generated 3-day slots:', threeDaySlots);
    } catch (error: any) {
      console.error('Error generating slots:', error);
      setError(error.message || 'Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateThreeDaySlots();
  }, [merchantId, selectedStaff]);

  return {
    slots,
    loading,
    error,
    refreshSlots: generateThreeDaySlots
  };
};
