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
import { sendNewBookingNotification } from '@/services/simpleNotificationService';
import { sendNotificationToUser } from '@/services/notificationService';
import { sendBookingConfirmation, sendNewBookingAlert } from '@/services/robustNotificationService';
import BookingSuccessAnimation from '@/components/customer/BookingSuccessAnimation';
import BookingFailureAnimation from '@/components/customer/BookingFailureAnimation';

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
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showFailureAnimation, setShowFailureAnimation] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!userId || !merchantId) {
      setShowFailureAnimation(true);
      return;
    }
    
    if (!selectedServices || !selectedStaff || !bookingDate || !bookingTime) {
      setShowFailureAnimation(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('PAYMENT_FLOW: Starting payment processing...');

      // Simulate payment processing (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const serviceId = selectedServices[0]?.id;
      
      console.log('PAYMENT_FLOW: Creating booking...');

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
        setShowFailureAnimation(true);
        return;
      }

      const reserveResponse = reserveResult as unknown as BookingResponse;
      console.log('PAYMENT_FLOW: Slot reservation response:', reserveResponse);
      
      if (!reserveResponse.success) {
        setShowFailureAnimation(true);
        return;
      }

      const bookingId = reserveResponse.booking_id;
      console.log('PAYMENT_FLOW: Booking created with ID:', bookingId);
      
      // Store the booking ID for navigation
      setCreatedBookingId(bookingId);

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
        setShowFailureAnimation(true);
        return;
      }

      console.log('PAYMENT_FLOW: Booking confirmed successfully');

      // Step 3: Create payment record (non-blocking)
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
        } else {
          console.log('PAYMENT_FLOW: Payment record created successfully');
        }
      } catch (paymentCreationError) {
        console.error('PAYMENT_FLOW: Payment record creation failed:', paymentCreationError);
      }

      // Step 4: Get customer name for notifications
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      const customerName = customerProfile?.name || 'Customer';
      const serviceNames = selectedServices.map(s => s.name).join(', ');
      const timeSlotFormatted = formatTimeToAmPm(bookingTime);
      const dateFormatted = formatDateInIST(new Date(bookingDate), 'MMM d, yyyy');

      // Step 5: Send notification to customer (booking confirmation) - Using robust service
      try {
        console.log('PAYMENT_FLOW: Sending confirmation notification to customer...');
        
        await sendBookingConfirmation(
          userId,
          merchant?.shop_name || 'the shop',
          serviceNames,
          dateFormatted,
          timeSlotFormatted,
          bookingId
        );

        console.log('PAYMENT_FLOW: Customer notification sent successfully');
      } catch (customerNotificationError) {
        console.error('PAYMENT_FLOW: Error sending customer notification:', customerNotificationError);
        // Don't fail the booking for notification issues
      }

      // Step 6: Send notification to merchant (new booking alert) - Using robust service
      try {
        console.log('PAYMENT_FLOW: Sending notification to merchant...');
        console.log('PAYMENT_FLOW: Merchant user_id from state:', merchant?.user_id);
        
        if (merchant?.user_id) {
          console.log('PAYMENT_FLOW: Sending notification to merchant user_id:', merchant.user_id);

          await sendNewBookingAlert(
            merchant.user_id,
            customerName,
            serviceNames,
            `${dateFormatted} at ${timeSlotFormatted}`,
            bookingId
          );

          console.log('PAYMENT_FLOW: Merchant notification sent successfully');
        } else {
          console.error('PAYMENT_FLOW: No merchant user_id found in state');
        }
      } catch (merchantNotificationError) {
        console.error('PAYMENT_FLOW: Error sending merchant notification:', merchantNotificationError);
        // Don't fail the booking for notification issues
      }

      // Step 7: Show success animation
      console.log('PAYMENT_FLOW: Process completed successfully');
      setShowSuccessAnimation(true);

    } catch (error) {
      console.error('PAYMENT_FLOW: Critical error:', error);
      setShowFailureAnimation(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessComplete = () => {
    setShowSuccessAnimation(false);
    // Navigate to receipt page with the correct booking ID
    if (createdBookingId) {
      navigate(`/receipt/${createdBookingId}`, {
        state: {
          booking: {
            id: createdBookingId,
            date: bookingDate,
            time_slot: bookingTime,
            status: 'confirmed',
            payment_status: 'completed',
            total_duration: totalDuration,
            services: selectedServices,
            merchants: merchant,
            staff: selectedStaffDetails
          },
          merchant,
          selectedServices,
          totalPrice,
          totalDuration,
          selectedStaff,
          selectedStaffDetails,
          bookingDate,
          bookingTime,
          paymentMethod: 'pay_on_shop'
        }
      });
    } else {
      // Fallback to calendar page if no booking ID
      navigate('/calendar');
    }
  };

  const handleFailureComplete = () => {
    setShowFailureAnimation(false);
    toast.error('Booking failed. Please try again.');
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
    <>
      {/* Success Animation */}
      <BookingSuccessAnimation 
        isVisible={showSuccessAnimation}
        onComplete={handleSuccessComplete}
      />

      {/* Failure Animation */}
      <BookingFailureAnimation 
        isVisible={showFailureAnimation}
        onComplete={handleFailureComplete}
      />

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
    </>
  );
};

export default PaymentPage;
