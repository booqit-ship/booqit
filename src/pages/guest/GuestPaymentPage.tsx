
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import BookingSuccessAnimation from '@/components/customer/BookingSuccessAnimation';
import BookingFailureAnimation from '@/components/customer/BookingFailureAnimation';

interface BookingResponse {
  success: boolean;
  booking_id?: string;
  payment_id?: string;
  error?: string;
  message?: string;
}

const GuestPaymentPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    guestInfo,
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

  console.log('GUEST PAYMENT: Page loaded with data:', {
    guestInfo,
    merchant: !!merchant,
    selectedServices: selectedServices?.length || 0,
    totalPrice,
    totalDuration,
    selectedStaff,
    bookingDate,
    bookingTime
  });

  const handlePayment = async () => {
    if (!guestInfo || !merchantId) {
      console.error('GUEST PAYMENT: Missing guest info or merchant ID');
      setShowFailureAnimation(true);
      return;
    }
    
    if (!selectedServices || !selectedStaff || !bookingDate || !bookingTime) {
      console.error('GUEST PAYMENT: Missing booking details');
      setShowFailureAnimation(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('GUEST PAYMENT: Starting guest booking creation...');

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const serviceIds = selectedServices.map(s => s.id);
      
      console.log('GUEST PAYMENT: Creating guest booking with enhanced function:', {
        guestName: guestInfo.name,
        guestPhone: guestInfo.phone,
        guestEmail: guestInfo.email || null,
        merchantId,
        serviceIds,
        staffId: selectedStaff,
        date: bookingDate,
        timeSlot: bookingTime,
        totalDuration,
        paymentAmount: Number(totalPrice),
        paymentMethod: 'pay_on_shop'
      });

      // Create guest booking and payment in one database transaction
      const { data: bookingResult, error: bookingError } = await supabase.rpc('create_guest_booking_safe', {
        p_guest_name: guestInfo.name,
        p_guest_phone: guestInfo.phone,
        p_guest_email: guestInfo.email || null,
        p_merchant_id: merchantId,
        p_service_ids: serviceIds,
        p_staff_id: selectedStaff,
        p_date: bookingDate,
        p_time_slot: bookingTime,
        p_total_duration: totalDuration,
        p_payment_amount: Number(totalPrice),
        p_payment_method: 'pay_on_shop'
      });

      if (bookingError) {
        console.error('GUEST PAYMENT: Error creating guest booking:', bookingError);
        setShowFailureAnimation(true);
        return;
      }

      const bookingResponse = bookingResult as unknown as BookingResponse;
      console.log('GUEST PAYMENT: Guest booking response:', bookingResponse);
      
      if (!bookingResponse.success) {
        console.error('GUEST PAYMENT: Guest booking failed:', bookingResponse.error);
        toast.error(bookingResponse.error || 'Failed to create booking');
        setShowFailureAnimation(true);
        return;
      }

      const bookingId = bookingResponse.booking_id;
      console.log('GUEST PAYMENT: Guest booking and payment created successfully with ID:', bookingId);
      
      setCreatedBookingId(bookingId);

      // Send notification to merchant about new guest booking
      try {
        console.log('GUEST PAYMENT: Sending notification to merchant...');
        
        if (merchant?.user_id) {
          const serviceNames = selectedServices.map(s => s.name).join(', ');
          const timeSlotFormatted = formatTimeToAmPm(bookingTime);
          const dateFormatted = formatDateInIST(new Date(bookingDate), 'MMM d, yyyy');

          // Use the edge function directly for merchant notification
          const { error: notificationError } = await supabase.functions.invoke('send-notification', {
            body: {
              userId: merchant.user_id,
              title: '📅 New Booking!',
              body: `${guestInfo.name} booked ${serviceNames} for ${dateFormatted} at ${timeSlotFormatted}`,
              data: {
                type: 'new_booking',
                bookingId: bookingId
              }
            }
          });

          if (notificationError) {
            console.error('GUEST PAYMENT: Merchant notification error:', notificationError);
          } else {
            console.log('GUEST PAYMENT: Merchant notification sent successfully');
          }
        } else {
          console.warn('GUEST PAYMENT: No merchant user_id found');
        }
      } catch (merchantNotificationError) {
        console.error('GUEST PAYMENT: Error sending merchant notification:', merchantNotificationError);
        // Don't fail the booking for notification issues
      }

      console.log('GUEST PAYMENT: Guest booking process completed successfully');
      setShowSuccessAnimation(true);

    } catch (error) {
      console.error('GUEST PAYMENT: Critical error:', error);
      setShowFailureAnimation(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuccessComplete = () => {
    setShowSuccessAnimation(false);
    if (createdBookingId) {
      navigate(`/guest-booking-success/${merchantId}`, {
        state: {
          bookingId: createdBookingId,
          guestInfo,
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
      // Fallback to merchant page
      navigate(`/book/${merchantId}`);
    }
  };

  const handleFailureComplete = () => {
    setShowFailureAnimation(false);
    toast.error('Booking failed. Please try again.');
  };

  const handleGoBack = () => {
    navigate(-1);
  };
  
  if (!guestInfo || !merchant || !selectedServices || !bookingDate || !bookingTime) {
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
          {/* Guest Info */}
          <Card className="border-l-4 border-l-booqit-primary">
            <CardHeader>
              <CardTitle className="font-righteous text-lg font-light">Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-poppins text-gray-600">Name</span>
                <span className="font-poppins font-medium">{guestInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-poppins text-gray-600">Phone</span>
                <span className="font-poppins font-medium">{guestInfo.phone}</span>
              </div>
              {guestInfo.email && (
                <div className="flex justify-between">
                  <span className="font-poppins text-gray-600">Email</span>
                  <span className="font-poppins font-medium">{guestInfo.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

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
              <div className="flex items-center justify-center p-6 bg-blue-50 rounded-lg border border-blue-200">
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
          <Button 
            size="lg" 
            onClick={handlePayment} 
            disabled={isProcessing} 
            className="w-full bg-booqit-primary hover:bg-booqit-primary/90 py-6 font-poppins font-semibold text-base"
          >
            {isProcessing ? 'Processing...' : `Confirm Booking - Pay ₹${totalPrice} at Shop`}
          </Button>
        </div>
      </div>
    </>
  );
};

export default GuestPaymentPage;
