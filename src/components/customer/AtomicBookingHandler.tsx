
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDateInIST } from '@/utils/dateUtils';

interface BookingData {
  userId: string;
  merchantId: string;
  selectedServices: any[];
  selectedStaff: string;
  selectedStaffDetails: any;
  selectedDate: Date;
  selectedTime: string;
  totalDuration: number;
  totalPrice: number;
}

export const useAtomicBookingHandler = () => {
  const [isBooking, setIsBooking] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const lockSlots = useCallback(async (
    staffId: string,
    date: Date,
    timeSlot: string,
    duration: number
  ): Promise<boolean> => {
    setIsLocking(true);
    try {
      const dateStr = formatDateInIST(date, 'yyyy-MM-dd');
      console.log('🔒 Locking slots for atomic booking:', {
        staffId,
        date: dateStr,
        timeSlot,
        duration
      });

      const { data: lockResult, error: lockError } = await supabase.rpc(
        'create_atomic_multi_slot_lock',
        {
          p_staff_id: staffId,
          p_date: dateStr,
          p_start_time: timeSlot,
          p_service_duration: duration,
          p_lock_duration_minutes: 5
        }
      );

      if (lockError) {
        console.error('❌ Slot locking error:', lockError);
        toast.error('Failed to reserve slots');
        return false;
      }

      const response = lockResult as { success: boolean; error?: string };
      if (!response.success) {
        console.warn('❌ Slot lock failed:', response.error);
        toast.error(response.error || 'Slots not available');
        return false;
      }

      console.log('✅ Slots locked successfully');
      return true;
    } catch (error) {
      console.error('❌ Error locking slots:', error);
      toast.error('Failed to reserve slots');
      return false;
    } finally {
      setIsLocking(false);
    }
  }, []);

  const releaseSlots = useCallback(async (
    staffId: string,
    date: Date,
    timeSlot: string,
    duration: number
  ): Promise<void> => {
    try {
      const dateStr = formatDateInIST(date, 'yyyy-MM-dd');
      console.log('🔓 Releasing slot locks:', {
        staffId,
        date: dateStr,
        timeSlot,
        duration
      });

      await supabase.rpc('release_atomic_multi_slot_lock', {
        p_staff_id: staffId,
        p_date: dateStr,
        p_start_time: timeSlot,
        p_service_duration: duration
      });

      console.log('✅ Slot locks released');
    } catch (error) {
      console.error('❌ Error releasing slots:', error);
    }
  }, []);

  const createConfirmedBooking = useCallback(async (bookingData: BookingData): Promise<{
    success: boolean;
    bookingId?: string;
    error?: string;
  }> => {
    setIsBooking(true);
    try {
      const dateStr = formatDateInIST(bookingData.selectedDate, 'yyyy-MM-dd');
      const serviceId = bookingData.selectedServices[0]?.id;
      const serviceDuration = bookingData.selectedServices[0]?.duration || 30;

      console.log('📝 Creating confirmed booking with atomic slot blocking:', {
        p_user_id: bookingData.userId,
        p_merchant_id: bookingData.merchantId,
        p_service_id: serviceId,
        p_staff_id: bookingData.selectedStaff,
        p_date: dateStr,
        p_time_slot: bookingData.selectedTime,
        p_service_duration: serviceDuration,
        p_services: JSON.stringify(bookingData.selectedServices),
        p_total_duration: bookingData.totalDuration
      });

      const { data: bookingResult, error: bookingError } = await supabase.rpc(
        'create_confirmed_booking_with_services',
        {
          p_user_id: bookingData.userId,
          p_merchant_id: bookingData.merchantId,
          p_service_id: serviceId,
          p_staff_id: bookingData.selectedStaff,
          p_date: dateStr,
          p_time_slot: bookingData.selectedTime,
          p_service_duration: serviceDuration,
          p_services: JSON.stringify(bookingData.selectedServices),
          p_total_duration: bookingData.totalDuration
        }
      );

      if (bookingError) {
        console.error('❌ Error creating confirmed booking:', bookingError);
        return {
          success: false,
          error: `Failed to create booking: ${bookingError.message}`
        };
      }

      const response = bookingResult as { success: boolean; booking_id?: string; error?: string };
      if (!response.success) {
        console.error('❌ Booking creation failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to create booking'
        };
      }

      console.log('✅ Confirmed booking created successfully:', response.booking_id);
      return {
        success: true,
        bookingId: response.booking_id
      };

    } catch (error) {
      console.error('❌ Error in booking creation:', error);
      return {
        success: false,
        error: 'Unexpected error during booking creation'
      };
    } finally {
      setIsBooking(false);
    }
  }, []);

  return {
    lockSlots,
    releaseSlots,
    createConfirmedBooking,
    isBooking,
    isLocking
  };
};
