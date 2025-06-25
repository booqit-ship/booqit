
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { NotificationTemplateService } from '@/services/NotificationTemplateService';

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
    console.log('PAYMENT_FLOW: Starting payment processing with working RPC...');

    try {
      // Use the working RPC function (same as guest bookings use)
      const { data: bookingResult, error: bookingError } = await supabase.rpc(
        'create_confirmed_booking',
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

      if (bookingError) {
        console.error('PAYMENT_FLOW: Booking creation error:', bookingError);
        throw new Error(bookingError.message);
      }

      // Cast the response properly to handle the actual RPC return format
      const response = bookingResult as unknown as BookingResponse;

      if (!response?.success) {
        console.error('PAYMENT_FLOW: Booking failed:', response?.error);
        throw new Error(response?.error || 'Booking failed');
      }

      const bookingId = response.booking_id;
      console.log('PAYMENT_FLOW: Booking created successfully with ID:', bookingId);

      // Update booking with services data and payment status
      try {
        await supabase
          .from('bookings')
          .update({
            services: paymentData.serviceIds.map(id => ({ id })),
            total_duration: paymentData.totalDuration,
            payment_status: 'completed'
          })
          .eq('id', bookingId);
        
        console.log('PAYMENT_FLOW: Booking updated with services and payment status');
      } catch (updateError) {
        console.error('PAYMENT_FLOW: Booking update error:', updateError);
      }

      // Create payment record
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
        // Don't fail the booking for payment record issues
      } else {
        console.log('PAYMENT_FLOW: Payment record created successfully');
      }

      // Send notifications using enhanced template service
      console.log('PAYMENT_FLOW: Sending notifications...');

      // Notify customer
      const customerNotified = await NotificationTemplateService.sendStandardizedNotification(
        user.id,
        'booking_confirmed',
        {
          type: 'booking_confirmed',
          bookingId: bookingId!,
          shopName: paymentData.merchantName,
          serviceName: paymentData.serviceNames,
          dateTime: NotificationTemplateService.formatDateTime(paymentData.date, paymentData.timeSlot)
        }
      );

      // Get merchant user ID and notify merchant
      const { data: merchant } = await supabase
        .from('merchants')
        .select('user_id')
        .eq('id', paymentData.merchantId)
        .single();

      if (merchant?.user_id) {
        const merchantNotified = await NotificationTemplateService.sendStandardizedNotification(
          merchant.user_id,
          'new_booking',
          {
            type: 'new_booking',
            bookingId: bookingId!,
            customerName: user.user_metadata?.name || 'Customer',
            serviceName: paymentData.serviceNames,
            dateTime: NotificationTemplateService.formatDateTime(paymentData.date, paymentData.timeSlot)
          }
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
