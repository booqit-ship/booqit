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
import BookingSuccessAnimation from '@/components/customer/BookingSuccessAnimation';
import BookingFailureAnimation from '@/components/customer/BookingFailureAnimation';
import { useBookingCompletion } from '@/hooks/useBookingCompletion';
import { NotificationTemplateService } from '@/services/NotificationTemplateService';

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
  const { userId, user } = useAuth();
  const { onBookingConfirmed, onNewBooking } = useBookingCompletion();
  
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
      console.error('PAYMENT_FLOW: Missing user ID or merchant ID');
      setShowFailureAnimation(true);
      return;
    }
    
    if (!selectedServices || !selectedStaff || !bookingDate || !bookingTime) {
      console.error('PAYMENT_FLOW: Missing booking details');
      setShowFailureAnimation(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('PAYMENT_FLOW: Starting authenticated user payment processing...');

      // Simulate payment processing (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const serviceId = selectedServices[0]?.id;
      
      console.log('PAYMENT_FLOW: Creating authenticated user booking...');

      // ✅ FIXED: Use standardized RPC function for slot reservation
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
        console.error('PAYMENT_FLOW: Slot reservation failed:', reserveResponse.error);
        toast.error(reserveResponse.error || 'Failed to reserve slot');
        setShowFailureAnimation(true);
        return;
      }

      const bookingId = reserveResponse.booking_id;
      console.log('PAYMENT_FLOW: Booking created with ID:', bookingId);
      
      setCreatedBookingId(bookingId);

      // ✅ FIXED: Use standardized RPC function for confirmation instead of direct update
      const { data: confirmResult, error: confirmError } = await supabase.rpc('confirm_pending_booking', {
        p_booking_id: bookingId,
        p_user_id: userId
      });

      if (confirmError) {
        console.error('PAYMENT_FLOW: Error confirming booking:', confirmError);
        setShowFailureAnimation(true);
        return;
      }

      const confirmResponse = confirmResult as unknown as BookingResponse;
      if (!confirmResponse.success) {
        console.error('PAYMENT_FLOW: Booking confirmation failed:', confirmResponse.error);
        toast.error(confirmResponse.error || 'Failed to confirm booking');
        setShowFailureAnimation(true);
        return;
      }

      // Update booking with additional details using safe direct update (non-status fields)
      try {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            services: selectedServices,
            total_duration: totalDuration,
            payment_status: 'completed'
          })
          .eq('id', bookingId);

        if (updateError) {
          console.error('PAYMENT_FLOW: Error updating booking details:', updateError);
          // Don't fail the process for this
        }
      } catch (updateDetailError) {
        console.error('PAYMENT_FLOW: Booking detail update failed:', updateDetailError);
        // Don't fail the process for this
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

      // ✅ Step 4: Send enhanced standardized notifications (the trigger handles basic ones)
      try {
        console.log('PAYMENT_FLOW: Sending enhanced standardized notifications...');
        
        const serviceNames = selectedServices.map(s => s.name).join(', ');
        const dateTimeFormatted = NotificationTemplateService.formatDateTime(bookingDate, bookingTime);

        // Get correct customer name from user profile/auth
        const customerName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Customer';
        console.log('PAYMENT_FLOW: Using customer name:', customerName);

        // ✅ Enhanced Customer "Booking Confirmed" notification
        const customerNotified = await NotificationTemplateService.sendStandardizedNotification(
          userId,
          'booking_confirmed',
          {
            type: 'booking_confirmed',
            bookingId,
            shopName: merchant.shop_name,
            serviceName: serviceNames,
            dateTime: dateTimeFormatted
          }
        );

        console.log('PAYMENT_FLOW: Enhanced customer notification result:', customerNotified);

        // ✅ Enhanced Merchant "New Booking" notification 
        if (merchant?.user_id) {
          const merchantNotified = await NotificationTemplateService.sendStandardizedNotification(
            merchant.user_id,
            'new_booking',
            {
              type: 'new_booking',
              bookingId,
              customerName, // ✅ FIXED: Use actual customer name, not stylist name
              serviceName: serviceNames,
              dateTime: dateTimeFormatted
            }
          );

          console.log('PAYMENT_FLOW: Enhanced merchant notification result:', merchantNotified);
        } else {
          console.warn('PAYMENT_FLOW: No merchant user_id found for enhanced notifications');
        }
      } catch (notificationError) {
        console.error('PAYMENT_FLOW: Enhanced notification error:', notificationError);
        // Don't fail the booking for notification issues
      }

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
