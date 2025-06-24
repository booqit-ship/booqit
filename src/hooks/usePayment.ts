
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SimpleNotificationService } from '@/services/SimpleNotificationService';

export interface PaymentData {
  merchantId: string;
  serviceIds: string[];
  staffId: string;
  date: string;
  timeSlot: string;
  totalPrice: number;
  totalDuration: number;
  merchantName: string;
  serviceNames: string;
}

interface BookingResponse {
  success: boolean;
  booking_id?: string;
  error?: string;
  message?: string;
}

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const processPayment = async (paymentData: PaymentData, paymentMethod: string = 'pay_on_shop') => {
    if (!user) {
      toast.error('Please log in to continue');
      return;
    }

    setIsProcessing(true);
    console.log('PAYMENT_FLOW: Starting payment processing...');

    try {
      // Step 1: Create booking
      console.log('PAYMENT_FLOW: Creating booking...');
      const { data: bookingResponse, error: bookingError } = await supabase.rpc(
        'reserve_slot_immediately',
        {
          p_user_id: user.id,
          p_merchant_id: paymentData.merchantId,
          p_service_id: paymentData.serviceIds[0],
          p_staff_id: paymentData.staffId,
          p_date: paymentData.date,
          p_time_slot: paymentData.timeSlot,
          p_service_duration: paymentData.totalDuration
        }
      );

      if (bookingError || !bookingResponse) {
        throw new Error(bookingError?.message || 'Failed to create booking');
      }

      const response = bookingResponse as BookingResponse;
      console.log('PAYMENT_FLOW: Booking response:', response);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create booking');
      }

      const bookingId = response.booking_id;
      console.log('PAYMENT_FLOW: Booking created with ID:', bookingId);

      // Step 2: Confirm the booking
      const { error: confirmError } = await supabase.rpc('confirm_pending_booking', {
        p_booking_id: bookingId,
        p_user_id: user.id
      });

      if (confirmError) {
        throw new Error('Failed to confirm booking');
      }

      console.log('PAYMENT_FLOW: Booking confirmed successfully');

      // Step 3: Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          method: paymentMethod,
          amount: paymentData.totalPrice,
          status: 'completed'
        });

      if (paymentError) {
        console.error('PAYMENT_FLOW: Payment record error:', paymentError);
      } else {
        console.log('PAYMENT_FLOW: Payment record created successfully');
      }

      // Step 4: Send notifications using simple service
      console.log('PAYMENT_FLOW: Sending notifications...');

      // Notify customer
      const customerNotified = await SimpleNotificationService.notifyCustomerBookingConfirmed(
        user.id,
        paymentData.merchantName,
        paymentData.serviceNames,
        `${paymentData.date} at ${paymentData.timeSlot}`,
        bookingId
      );

      // Get merchant user ID and notify merchant
      const { data: merchant } = await supabase
        .from('merchants')
        .select('user_id')
        .eq('id', paymentData.merchantId)
        .single();

      if (merchant?.user_id) {
        const merchantNotified = await SimpleNotificationService.notifyMerchantOfNewBooking(
          merchant.user_id,
          user.user_metadata?.name || 'Customer',
          paymentData.serviceNames,
          `${paymentData.date} at ${paymentData.timeSlot}`,
          bookingId
        );
        console.log('PAYMENT_FLOW: Merchant notification result:', merchantNotified);
      }

      console.log('PAYMENT_FLOW: Customer notification result:', customerNotified);
      console.log('PAYMENT_FLOW: Process completed successfully');

      // Navigate to receipt
      navigate(`/receipt/${bookingId}`, {
        state: {
          booking: { id: bookingId },
          merchant: { shop_name: paymentData.merchantName },
          selectedServices: paymentData.serviceIds.map(id => ({ name: paymentData.serviceNames })),
          totalPrice: paymentData.totalPrice,
          totalDuration: paymentData.totalDuration
        }
      });

      toast.success('Booking confirmed successfully!');

    } catch (error: any) {
      console.error('PAYMENT_FLOW: Error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processPayment,
    isProcessing
  };
};
