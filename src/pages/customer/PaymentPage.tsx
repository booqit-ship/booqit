
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useSlotLocking } from '@/hooks/useSlotLocking';
import { sendNewBookingNotification, sendBookingCompletedNotification } from '@/services/eventNotificationService';

interface BookingResponse {
  success: boolean;
  booking_id?: string;
  error?: string;
  message?: string;
}

const PaymentPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const { releaseSlot } = useSlotLocking();
  
  const {
    merchant,
    selectedServices,
    totalPrice,
    totalDuration,
    selectedStaff,
    selectedStaffDetails,
    bookingDate,
    bookingTime,
    lockedSlotInfo
  } = location.state || {};
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Cleanup locked slots on unmount if booking wasn't completed
  useEffect(() => {
    return () => {
      if (lockedSlotInfo && !isProcessing) {
        console.log('🔓 Releasing locked slots from payment page cleanup');
        releaseSlot(
          lockedSlotInfo.staffId,
          lockedSlotInfo.date,
          lockedSlotInfo.time,
          lockedSlotInfo.duration
        );
      }
    };
  }, [lockedSlotInfo, releaseSlot, isProcessing]);

  const handlePayment = async () => {
    if (!userId || !merchantId) {
      toast.error('Authentication required');
      return;
    }
    
    if (!selectedServices || !selectedStaff || !bookingDate || !bookingTime) {
      toast.error('Booking information is missing');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('💳 Processing payment and creating confirmed booking...');

      // Simulate payment processing (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Release temporary locks first since we're creating a confirmed booking
      if (lockedSlotInfo) {
        console.log('🔓 Releasing temporary locks before creating confirmed booking');
        await releaseSlot(
          lockedSlotInfo.staffId,
          lockedSlotInfo.date,
          lockedSlotInfo.time,
          lockedSlotInfo.duration
        );
      }

      // Create booking directly as confirmed with services and total duration
      const serviceId = selectedServices[0]?.id;
      const serviceDuration = selectedServices[0]?.duration || 30;
      
      console.log('📝 Creating confirmed booking with correct parameter order:', {
        p_user_id: userId,
        p_merchant_id: merchantId,
        p_service_id: serviceId,
        p_staff_id: selectedStaff,
        p_date: bookingDate,
        p_time_slot: bookingTime,
        p_service_duration: serviceDuration,
        p_services: JSON.stringify(selectedServices),
        p_total_duration: totalDuration
      });

      // Call the database function with the CORRECT parameter order matching the function definition
      const { data: bookingResult, error: bookingError } = await supabase.rpc(
        'create_confirmed_booking_with_services',
        {
          p_user_id: userId,
          p_merchant_id: merchantId,
          p_service_id: serviceId,
          p_staff_id: selectedStaff,
          p_date: bookingDate,
          p_time_slot: bookingTime,
          p_service_duration: serviceDuration,
          p_services: JSON.stringify(selectedServices),
          p_total_duration: totalDuration
        }
      );

      if (bookingError) {
        console.error('❌ Error creating confirmed booking:', bookingError);
        toast.error(`Failed to create booking: ${bookingError.message}`);
        return;
      }

      const response = bookingResult as unknown as BookingResponse;
      console.log('✅ Confirmed booking creation response:', response);
      
      if (!response.success) {
        toast.error(response.error || 'Failed to create booking');
        return;
      }

      console.log('✅ Booking created as confirmed with ID:', response.booking_id);

      // Create payment record
      console.log('💰 Creating payment record for booking:', response.booking_id);
      
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: response.booking_id,
          method: 'pay_on_shop',
          amount: totalPrice,
          status: 'completed'
        })
        .select()
        .single();
      
      if (paymentError) {
        console.error('⚠️ Error creating payment record:', paymentError);
        // Still update the booking payment status
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ payment_status: 'completed' })
          .eq('id', response.booking_id);
        
        if (updateError) {
          console.error('❌ Error updating booking payment status:', updateError);
        }
        
        toast.warning('Booking confirmed but payment record creation encountered an issue');
      } else {
        console.log('✅ Payment record created successfully:', paymentData);
        
        // Update booking payment status to completed
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ payment_status: 'completed' })
          .eq('id', response.booking_id);
        
        if (updateError) {
          console.error('❌ Error updating booking payment status:', updateError);
        } else {
          console.log('✅ Booking payment status updated to completed');
        }
      }

      // Send notifications
      console.log('🔔 Sending booking notifications...');
      
      try {
        // Get merchant user ID
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('user_id')
          .eq('id', merchantId)
          .single();

        // Get customer name from profile
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();

        const customerName = customerProfile?.name || 'Customer';
        const serviceName = selectedServices[0]?.name || 'Service';
        const formattedTime = formatTimeToAmPm(bookingTime);
        const formattedDate = formatDateInIST(new Date(bookingDate), 'MMM d, yyyy');
        const dateTime = `${formattedDate} at ${formattedTime}`;

        // Send notifications
        if (merchantData?.user_id) {
          await sendNewBookingNotification(
            merchantData.user_id,
            customerName,
            serviceName,
            dateTime,
            response.booking_id
          );
          console.log('✅ New booking notification sent to merchant');
        }

        await sendBookingCompletedNotification(
          userId,
          merchant.shop_name || 'Salon',
          response.booking_id
        );
        console.log('✅ Booking confirmation sent to customer');

      } catch (notificationError) {
        console.error('⚠️ Error sending booking notifications:', notificationError);
      }
      
      toast.success('Payment successful! Your booking is confirmed.');

      // Navigate to receipt page
      navigate(`/receipt/${response.booking_id}`, {
        state: {
          merchant,
          selectedServices,
          totalPrice,
          totalDuration,
          selectedStaff,
          selectedStaffDetails,
          bookingDate,
          bookingTime,
          bookingId: response.booking_id,
          paymentMethod: 'pay_on_shop'
        }
      });
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoBack = async () => {
    // Don't release locks when going back - let the user return to their reserved slot
    navigate(-1);
  };
  
  if (!merchant || !selectedServices || !bookingDate || !bookingTime) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Booking information missing</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }
  
  return (
    <div className="pb-24 bg-white min-h-screen">
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-0 text-white hover:bg-white/20" 
            onClick={handleGoBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium font-righteous">Payment</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous text-lg font-light">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-poppins text-gray-600">Shop</span>
              <span className="font-poppins font-medium">{merchant.shop_name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-poppins text-gray-600">Services</span>
              <div className="text-right">
                {selectedServices?.map((service: any, index: number) => (
                  <div key={index} className="font-poppins font-medium">
                    {service.name}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between">
              <span className="font-poppins text-gray-600">Stylist</span>
              <span className="font-poppins font-medium">{selectedStaffDetails?.name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-poppins text-gray-600">Date & Time</span>
              <div className="text-right font-poppins font-medium">
                <div>{formatDateInIST(new Date(bookingDate), 'MMM d, yyyy')}</div>
                <div>{formatTimeToAmPm(bookingTime)}</div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <span className="font-poppins text-gray-600">Duration</span>
              <span className="font-poppins font-medium">{totalDuration} minutes</span>
            </div>
            
            <hr />
            
            <div className="flex justify-between text-lg font-semibold">
              <span className="font-righteous">Total</span>
              <span className="font-righteous">₹{totalPrice}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous text-lg font-light">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-blue-50 rounded-lg border border-blue-200 px-[24px] py-[10px]">
              <div className="text-center">
                <Smartphone className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <span className="text-blue-800 font-medium font-poppins">Pay at Shop</span>
                <p className="text-sm text-blue-600 mt-1">Complete payment at the shop</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slot Reserved Status */}
        {lockedSlotInfo && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-green-800 text-sm font-poppins">
                ✅ Your time slot is reserved and will be confirmed after payment
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status Message */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-blue-800 text-sm font-poppins">
              ℹ️ Complete payment to confirm your booking. Your selected time slot is temporarily reserved.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          size="lg" 
          onClick={handlePayment} 
          disabled={isProcessing} 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 py-6 font-poppins font-semibold text-base text-center"
        >
          {isProcessing ? 'Processing...' : `Confirm Booking - Pay ₹${totalPrice} at Shop`}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
