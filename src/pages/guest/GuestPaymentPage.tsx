
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Smartphone, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import BookingSuccessAnimation from '@/components/customer/BookingSuccessAnimation';
import BookingFailureAnimation from '@/components/customer/BookingFailureAnimation';
import { useBookingCompletion } from '@/hooks/useBookingCompletion';
import { NotificationTemplateService } from '@/services/NotificationTemplateService';

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
  const { onNewBooking } = useBookingCompletion();
  
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

  const handlePayment = async () => {
    if (!guestInfo || !merchantId) {
      console.error('PAYMENT: Missing info or merchant ID');
      setShowFailureAnimation(true);
      return;
    }
    
    if (!selectedServices || !selectedStaff || !bookingDate || !bookingTime) {
      console.error('PAYMENT: Missing booking details');
      setShowFailureAnimation(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const serviceIds = selectedServices.map(s => s.id);
      
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
        console.error('PAYMENT: Error creating booking:', bookingError);
        setShowFailureAnimation(true);
        return;
      }

      const bookingResponse = bookingResult as unknown as BookingResponse;
      
      if (!bookingResponse.success) {
        console.error('PAYMENT: Booking failed:', bookingResponse.error);
        toast.error(bookingResponse.error || 'Failed to create booking');
        setShowFailureAnimation(true);
        return;
      }

      const bookingId = bookingResponse.booking_id;
      setCreatedBookingId(bookingId);

      try {
        if (merchant?.user_id) {
          const serviceNames = selectedServices.map(s => s.name).join(', ');
          const dateTimeFormatted = NotificationTemplateService.formatDateTime(bookingDate, bookingTime);

          const merchantNotification = await NotificationTemplateService.sendStandardizedNotification(
            merchant.user_id,
            'new_booking',
            {
              type: 'new_booking',
              bookingId,
              customerName: guestInfo.name,
              serviceName: serviceNames,
              dateTime: dateTimeFormatted
            }
          );

          console.log('PAYMENT: Merchant notification result:', merchantNotification);
        }
      } catch (merchantNotificationError) {
        console.error('PAYMENT: Error sending merchant notification:', merchantNotificationError);
      }

      setShowSuccessAnimation(true);

    } catch (error) {
      console.error('PAYMENT: Critical error:', error);
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
      <div className="h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <p className="text-gray-500 mb-4 font-poppins">Booking information missing</p>
        <Button onClick={() => navigate(-1)} className="bg-purple-600 hover:bg-purple-700">Go Back</Button>
      </div>
    );
  }
  
  return (
    <>
      <BookingSuccessAnimation 
        isVisible={showSuccessAnimation}
        onComplete={handleSuccessComplete}
      />

      <BookingFailureAnimation 
        isVisible={showFailureAnimation}
        onComplete={handleFailureComplete}
      />

      <div className="pb-32 bg-gradient-to-br from-purple-50 via-white to-purple-50 min-h-screen">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0 z-10 shadow-lg">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="relative flex items-center justify-center">
              <Button variant="ghost" size="icon" className="absolute left-0 text-white hover:bg-white/20 rounded-full" onClick={handleGoBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-medium font-righteous">Payment</h1>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Info */}
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="font-righteous text-lg text-purple-800">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between bg-white p-3 rounded-lg shadow-sm">
                <span className="font-poppins text-gray-600">Name</span>
                <span className="font-poppins font-medium">{guestInfo.name}</span>
              </div>
              <div className="flex justify-between bg-white p-3 rounded-lg shadow-sm">
                <span className="font-poppins text-gray-600">Phone</span>
                <span className="font-poppins font-medium">{guestInfo.phone}</span>
              </div>
              {guestInfo.email && (
                <div className="flex justify-between bg-white p-3 rounded-lg shadow-sm">
                  <span className="font-poppins text-gray-600">Email</span>
                  <span className="font-poppins font-medium">{guestInfo.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Summary */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-righteous text-lg text-gray-800">Booking Summary</CardTitle>
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
              
              <hr className="border-purple-100" />
              
              <div className="flex justify-between text-lg font-semibold">
                <span className="font-righteous text-purple-800">Total</span>
                <span className="font-righteous text-purple-600">₹{totalPrice}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-righteous text-lg text-gray-800">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="text-center">
                  <Smartphone className="h-10 w-10 mx-auto text-blue-600 mb-3" />
                  <span className="text-blue-800 font-medium font-poppins text-lg">Pay at Shop</span>
                  <p className="text-sm text-blue-600 mt-1 font-poppins">Complete payment at the shop</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Message */}
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-lg">
            <CardContent className="p-4">
              <p className="text-blue-800 text-sm font-poppins text-center">
                ℹ️ Complete payment to confirm your booking. Payment is done at the shop.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl">
          <div className="max-w-lg mx-auto p-4">
            <Button 
              size="lg" 
              onClick={handlePayment} 
              disabled={isProcessing} 
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-6 font-poppins font-semibold text-base shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span>Confirm Booking - Pay ₹{totalPrice} at Shop</span>
                  <ChevronRight className="h-5 w-5" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuestPaymentPage;
