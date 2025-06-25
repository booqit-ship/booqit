
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
    console.log('PAYMENT_FLOW: Starting payment processing with existing RPC...');

    try {
      // Use the existing working RPC function
      const { data: bookingResult, error: bookingError } = await supabase.rpc(
        'create_confirmed_booking_with_services',
        {
          p_user_id: user.id,
          p_merchant_id: paymentData.merchantId,
          p_service_id: paymentData.serviceIds[0],
          p_staff_id: paymentData.staffId,
          p_date: paymentData.date,
          p_time_slot: paymentData.timeSlot,
          p_service_duration: paymentData.totalDuration,
          p_services: JSON.stringify(paymentData.serviceIds.map(id => ({ id }))),
          p_total_duration: paymentData.totalDuration
        }
      );

      if (bookingError) {
        console.error('PAYMENT_FLOW: Booking creation error:', bookingError);
        throw new Error(bookingError.message);
      }

      if (!bookingResult?.success) {
        console.error('PAYMENT_FLOW: Booking failed:', bookingResult?.error);
        throw new Error(bookingResult?.error || 'Booking failed');
      }

      const bookingId = bookingResult.booking_id;
      console.log('PAYMENT_FLOW: Booking created successfully with ID:', bookingId);

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
          bookingId,
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
            bookingId,
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
