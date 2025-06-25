
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
    console.log('PAYMENT_FLOW: Starting confirmed booking creation via RPC...');

    try {
      // ✅ Use working RPC function instead of direct insert
      console.log('PAYMENT_FLOW: Creating confirmed booking via RPC...');
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_confirmed_booking', {
        p_user_id: user.id,
        p_merchant_id: paymentData.merchantId,
        p_service_id: paymentData.serviceIds[0],
        p_staff_id: paymentData.staffId,
        p_date: paymentData.date,
        p_time_slot: paymentData.timeSlot,
        p_service_duration: paymentData.totalDuration
      });

      if (rpcError || !rpcResult?.success) {
        throw new Error(rpcError?.message || rpcResult?.error || 'Failed to create booking');
      }

      const bookingId = rpcResult.booking_id;
      console.log('PAYMENT_FLOW: Confirmed booking created with ID:', bookingId);

      // Step 2: Update payment status to completed (RPC creates with 'pending')
      try {
        console.log('PAYMENT_FLOW: Updating payment status to completed...');
        
        const { error: paymentUpdateError } = await supabase
          .from('bookings')
          .update({ payment_status: 'completed' })
          .eq('id', bookingId);
        
        if (paymentUpdateError) {
          console.error('PAYMENT_FLOW: Payment status update error:', paymentUpdateError);
        } else {
          console.log('PAYMENT_FLOW: Payment status updated to completed');
        }
      } catch (paymentUpdateError) {
        console.error('PAYMENT_FLOW: Payment status update failed:', paymentUpdateError);
      }

      // Step 3: Handle multiple services (add to booking_services table)
      if (paymentData.serviceIds.length > 1) {
        try {
          console.log('PAYMENT_FLOW: Adding multiple services...');
          
          const additionalServices = paymentData.serviceIds.slice(1).map(serviceId => ({
            booking_id: bookingId,
            service_id: serviceId
          }));

          const { error: servicesError } = await supabase
            .from('booking_services')
            .insert(additionalServices);
          
          if (servicesError) {
            console.error('PAYMENT_FLOW: Additional services error:', servicesError);
          } else {
            console.log('PAYMENT_FLOW: Multiple services added successfully');
          }
        } catch (servicesError) {
          console.error('PAYMENT_FLOW: Multiple services addition failed:', servicesError);
        }
      }

      // Step 4: Create payment record
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

      // Step 5: Send notifications using enhanced service
      console.log('PAYMENT_FLOW: Sending notifications...');

      // Format date and time for notifications
      const dateTimeFormatted = NotificationTemplateService.formatDateTime(
        paymentData.date, 
        paymentData.timeSlot
      );

      // Get correct customer name
      const customerName = user.user_metadata?.name || user.email?.split('@')[0] || 'Customer';

      // Notify customer
      const customerNotified = await NotificationTemplateService.sendStandardizedNotification(
        user.id,
        'booking_confirmed',
        {
          type: 'booking_confirmed',
          bookingId,
          shopName: paymentData.merchantName,
          serviceName: paymentData.serviceNames,
          dateTime: dateTimeFormatted
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
            customerName,
            serviceName: paymentData.serviceNames,
            dateTime: dateTimeFormatted
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
