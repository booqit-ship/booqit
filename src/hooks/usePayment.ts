
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
    console.log('PAYMENT_FLOW: Starting direct confirmed booking creation...');

    try {
      // Get customer info first
      let customerInfo = { name: 'Customer', email: '', phone: '' };
      
      // Try to get from profiles first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, email, phone')
        .eq('id', user.id)
        .single();

      if (profileData) {
        customerInfo = profileData;
      } else {
        // Fallback to auth.users if no profile
        customerInfo = {
          name: user.user_metadata?.name || 'Customer',
          email: user.email || '',
          phone: user.user_metadata?.phone || ''
        };
      }

      // Get staff name
      const { data: staffData } = await supabase
        .from('staff')
        .select('name')
        .eq('id', paymentData.staffId)
        .single();

      const staffName = staffData?.name || 'Stylist';

      // ✅ FIXED: Direct confirmed booking creation - single step, no RPC calls
      console.log('PAYMENT_FLOW: Creating confirmed booking directly...');
      
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          merchant_id: paymentData.merchantId,
          service_id: paymentData.serviceIds[0],
          staff_id: paymentData.staffId,
          date: paymentData.date,
          time_slot: paymentData.timeSlot,
          status: 'confirmed', // ✅ Directly set as confirmed
          payment_status: 'completed', // ✅ Directly set as completed
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          stylist_name: staffName,
          total_duration: paymentData.totalDuration
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(bookingError.message || 'Failed to create booking');
      }

      const bookingId = bookingData.id;
      console.log('PAYMENT_FLOW: Confirmed booking created with ID:', bookingId);

      // Step 2: Create payment record
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

      // Step 3: Send notifications using enhanced service
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
