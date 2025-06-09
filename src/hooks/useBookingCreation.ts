
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBookingNotifications } from './useBookingNotifications';
import { toast } from 'sonner';

interface BookingData {
  merchantId: string;
  serviceIds: string[];
  staffId: string;
  date: string;
  timeSlot: string;
  totalDuration: number;
  totalPrice: number;
}

export const useBookingCreation = () => {
  const { userId } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const { triggerNewBookingNotification, triggerBookingConfirmationNotification } = useBookingNotifications();

  const createBookingWithNotifications = async (bookingData: BookingData) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    setIsCreating(true);
    
    try {
      console.log('📝 Creating booking with data:', bookingData);

      // Get service names for notification
      const { data: services } = await supabase
        .from('services')
        .select('name')
        .in('id', bookingData.serviceIds);

      const serviceName = services?.map(s => s.name).join(', ') || 'Service';

      // Get customer and merchant info
      const [customerResult, merchantResult] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', userId).single(),
        supabase.from('merchants').select('shop_name, user_id').eq('id', bookingData.merchantId).single()
      ]);

      const customerName = customerResult.data?.name || 'Customer';
      const merchantName = merchantResult.data?.shop_name || 'Salon';
      const merchantUserId = merchantResult.data?.user_id;

      // Create the booking
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          merchant_id: bookingData.merchantId,
          service_id: bookingData.serviceIds[0], // For backward compatibility
          staff_id: bookingData.staffId,
          date: bookingData.date,
          time_slot: bookingData.timeSlot,
          status: 'pending',
          payment_status: 'pending',
          services: bookingData.serviceIds.map(id => ({ id, name: services?.find(s => s.id === id)?.name })),
          total_duration: bookingData.totalDuration
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating booking:', error);
        throw error;
      }

      console.log('✅ Booking created successfully:', booking.id);

      // Format date and time for notifications
      const dateTime = `${new Date(bookingData.date).toLocaleDateString()} at ${bookingData.timeSlot}`;

      // Send notifications
      if (merchantUserId) {
        await triggerNewBookingNotification(merchantUserId, {
          customerName,
          serviceName,
          dateTime,
          bookingId: booking.id
        });
      }

      await triggerBookingConfirmationNotification(userId, {
        merchantName,
        serviceName,
        dateTime,
        bookingId: booking.id
      });

      toast.success('Booking created successfully! 🎉');
      
      return booking;
    } catch (error) {
      console.error('❌ Error in booking creation:', error);
      toast.error('Failed to create booking. Please try again.');
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createBookingWithNotifications,
    isCreating
  };
};
