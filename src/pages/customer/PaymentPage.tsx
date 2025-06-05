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
interface BookingResponse {
  success: boolean;
  booking_id?: string;
  error?: string;
  message?: string;
}
const PaymentPage: React.FC = () => {
  const {
    merchantId
  } = useParams<{
    merchantId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    userId
  } = useAuth();
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
      console.log('Processing payment and creating booking...');

      // Simulate payment processing (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create the actual booking after payment
      const serviceId = selectedServices[0]?.id;
      const {
        data: bookingResult,
        error: bookingError
      } = await supabase.rpc('create_booking_from_payment' as any, {
        p_user_id: userId,
        p_merchant_id: merchantId,
        p_service_id: serviceId,
        p_staff_id: selectedStaff,
        p_date: bookingDate,
        p_time_slot: bookingTime,
        p_service_duration: totalDuration
      });
      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        toast.error(`Failed to create booking: ${bookingError.message}`);
        return;
      }
      const response = bookingResult as unknown as BookingResponse;
      if (!response.success) {
        toast.error(response.error || 'Failed to create booking');
        return;
      }

      // Create payment record
      const {
        error: paymentError
      } = await supabase.from('payments').insert({
        booking_id: response.booking_id,
        method: 'pay_on_shop',
        amount: totalPrice,
        status: 'completed'
      });
      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        toast.warning('Booking confirmed but payment record creation failed');
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
      console.error('Error processing payment:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Navigate back to datetime selection
  const handleGoBack = () => {
    navigate(-1);
  };
  if (!merchant || !selectedServices || !bookingDate || !bookingTime) {
    return <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Booking information missing</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>;
  }
  return <div className="pb-24 bg-white min-h-screen">
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
                {selectedServices?.map((service: any, index: number) => <div key={index} className="font-poppins font-medium">
                    {service.name}
                  </div>)}
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
    </div>;
};
export default PaymentPage;