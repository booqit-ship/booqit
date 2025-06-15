import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { sendNewBookingNotification } from '@/services/eventNotificationService';

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
  const {
    merchant,
    selectedServices,
    totalPrice,
    totalDuration,
    selectedStaff,
    selectedStaffDetails,
    bookingDate,
    bookingTime
  } = location.state || {};
  
  const [isProcessing, setIsProcessing] = useState(false);

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
      console.log('PAYMENT_FLOW: Starting payment processing...');
      console.log('Services:', selectedServices?.map(s => ({ name: s.name, duration: s.duration })));
      console.log('Total duration:', totalDuration, 'minutes');
      console.log('Total price:', totalPrice);

      // Simulate payment processing (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const serviceId = selectedServices[0]?.id;
      
      console.log('PAYMENT_FLOW: Creating booking with params:', {
        p_user_id: userId,
        p_merchant_id: merchantId,
        p_service_id: serviceId,
        p_staff_id: selectedStaff,
        p_date: bookingDate,
        p_time_slot: bookingTime,
        p_service_duration: totalDuration
      });

      // Step 1: Reserve the slot with total duration
      const { data: reserveResult, error: reserveError } = await supabase.rpc('reserve_slot_immediately', {
        p_user_id: userId,
        p_merchant_id: merchantId,
        p_service_id: serviceId,
        p_staff_id: selectedStaff,
        p_date: bookingDate,
        p_time_slot: bookingTime,
        p_service_duration: totalDuration
      });

      if (reserveError) {
        console.error('PAYMENT_FLOW: Error reserving slot:', reserveError);
        toast.error(`Failed to reserve slot: ${reserveError.message}`);
        return;
      }

      const reserveResponse = reserveResult as unknown as BookingResponse;
      console.log('PAYMENT_FLOW: Slot reservation response:', reserveResponse);
      
      if (!reserveResponse.success) {
        toast.error(reserveResponse.error || 'Failed to reserve slot');
        return;
      }

      const bookingId = reserveResponse.booking_id;
      console.log('PAYMENT_FLOW: Booking created with ID:', bookingId);

      // Step 2: Update booking with services and confirm status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          services: selectedServices,
          total_duration: totalDuration,
          payment_status: 'completed'
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('PAYMENT_FLOW: Error updating booking:', updateError);
        toast.error('Failed to confirm booking. Please contact support.');
        return;
      }

      console.log('PAYMENT_FLOW: Booking confirmed successfully');

      // Step 3: Create payment record (non-blocking)
      let paymentRecorded = false;
      try {
        const paymentData = {
          booking_id: bookingId,
          method: 'pay_on_shop',
          amount: Number(totalPrice),
          status: 'completed'
        };

        console.log('PAYMENT_FLOW: Creating payment record:', paymentData);

        const { error: paymentError } = await supabase
          .from('payments')
          .insert(paymentData);
        
        if (paymentError) {
          console.error('PAYMENT_FLOW: Payment record error:', paymentError);
          paymentRecorded = false;
        } else {
          console.log('PAYMENT_FLOW: Payment record created successfully');
          paymentRecorded = true;
        }
      } catch (paymentCreationError) {
        console.error('PAYMENT_FLOW: Payment record creation failed:', paymentCreationError);
        paymentRecorded = false;
      }

      // Step 4: Send notification to merchant (simplified - non-blocking)
      try {
        console.log('PAYMENT_FLOW: Sending notification to merchant...');
        
        // Get merchant user_id
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('user_id')
          .eq('id', merchantId)
          .single();

        if (merchantError) {
          console.error('PAYMENT_FLOW: Error fetching merchant data:', merchantError);
        } else if (merchantData?.user_id) {
          // Get customer name for notification
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .single();

          const customerName = profileData?.name || 'A customer';
          const serviceNames = selectedServices.map(s => s.name).join(', ');
          const timeSlotFormatted = formatTimeToAmPm(bookingTime);
          const dateFormatted = formatDateInIST(new Date(bookingDate), 'MMM d, yyyy');

          console.log('PAYMENT_FLOW: Sending simple notification to merchant:', {
            merchantUserId: merchantData.user_id,
            customerName,
            serviceNames,
            timeSlot: `${dateFormatted} at ${timeSlotFormatted}`,
            bookingId
          });

          // Send notification directly - no profile creation needed
          await sendNewBookingNotification(
            merchantData.user_id,
            customerName,
            serviceNames,
            `${dateFormatted} at ${timeSlotFormatted}`,
            bookingId
          );

          console.log('PAYMENT_FLOW: Notification sent successfully');
        }
      } catch (notificationError) {
        console.error('PAYMENT_FLOW: Error sending notification:', notificationError);
        // Don't fail the booking for notification issues
      }

      // Step 5: Show single success message
      console.log('PAYMENT_FLOW: Process completed successfully');
      
      if (paymentRecorded) {
        toast.success('Booking confirmed! Payment will be processed at the shop.');
      } else {
        toast.success('Booking confirmed! Payment record will be updated shortly.');
      }

      // Step 6: Navigate to receipt page
      navigate(`/receipt/${bookingId}`, {
        state: {
          merchant,
          selectedServices,
          totalPrice,
          totalDuration,
          selectedStaff,
          selectedStaffDetails,
          bookingDate,
          bookingTime,
          bookingId: bookingId,
          paymentMethod: 'pay_on_shop'
        }
      });

    } catch (error) {
      console.error('PAYMENT_FLOW: Critical error:', error);
      toast.error('Booking failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Navigate back to datetime selection
  const handleGoBack = () => {
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
          <Button variant="ghost" size="icon" className="absolute left-0 text-white hover:bg-white/20" onClick={handleGoBack}>
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
                    {service.name} ({service.duration}min)
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
              <span className="font-poppins text-gray-600">Total Duration</span>
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

        {/* Status Message */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-blue-800 text-sm font-poppins">
              ℹ️ Complete payment to confirm your booking. Payment is done at the shop.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button size="lg" onClick={handlePayment} disabled={isProcessing} className="w-full bg-booqit-primary hover:bg-booqit-primary/90 py-6 font-poppins font-semibold text-base text-center">
          {isProcessing ? 'Processing...' : `Confirm Booking - Pay ₹${totalPrice} at Shop`}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
