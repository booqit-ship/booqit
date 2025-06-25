
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
    console.log('PAYMENT_FLOW: Starting simplified payment processing...');

    try {
      // Get customer info
      let customerInfo = { name: '', email: '', phone: '' };
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, phone')
        .eq('id', user.id)
        .single();

      if (profile) {
        customerInfo = {
          name: profile.name || user.user_metadata?.name || 'Customer',
          email: profile.email || user.email || '',
          phone: profile.phone || user.user_metadata?.phone || ''
        };
      } else {
        // Create profile if it doesn't exist
        customerInfo = {
          name: user.user_metadata?.name || 'Customer',
          email: user.email || '',
          phone: user.user_metadata?.phone || ''
        };

        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
            role: 'customer'
          });
      }

      // Get staff info
      const { data: staffInfo } = await supabase
        .from('staff')
        .select('name')
        .eq('id', paymentData.staffId)
        .single();

      console.log('PAYMENT_FLOW: Creating confirmed booking directly...');

      // Create booking directly with confirmed status
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          merchant_id: paymentData.merchantId,
          service_id: paymentData.serviceIds[0],
          staff_id: paymentData.staffId,
          date: paymentData.date,
          time_slot: paymentData.timeSlot,
          status: 'confirmed',
          payment_status: 'completed',
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          stylist_name: staffInfo?.name || 'Stylist',
          total_duration: paymentData.totalDuration,
          services: paymentData.serviceIds.map(id => ({ id }))
        })
        .select()
        .single();

      if (bookingError) {
        console.error('PAYMENT_FLOW: Error creating booking:', bookingError);
        throw new Error(bookingError.message);
      }

      const bookingId = bookingData.id;
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

      // Send notifications using simple service
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
          customerInfo.name,
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
