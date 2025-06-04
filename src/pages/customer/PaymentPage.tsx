import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';

interface ConfirmBookingResponse {
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
    bookingTime,
    bookingId
  } = location.state || {};

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!bookingId || !userId) {
      toast.error('Booking information is missing');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Processing payment for booking:', bookingId);

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm the booking after payment
      const { data: confirmResult, error: confirmError } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: bookingId,
        p_user_id: userId
      });

      if (confirmError) {
        console.error('Error confirming booking:', confirmError);
        toast.error(`Failed to confirm booking: ${confirmError.message}`);
        return;
      }

      const response = confirmResult as unknown as ConfirmBookingResponse;
      
      if (!response.success) {
        toast.error(response.error || 'Failed to confirm booking');
        return;
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          method: selectedPaymentMethod,
          amount: totalPrice,
          status: 'completed'
        });

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        toast.warning('Booking confirmed but payment record creation failed');
      }

      toast.success('Payment successful! Your booking is confirmed.');

      // Navigate to receipt page
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
          bookingId,
          paymentMethod: selectedPaymentMethod
        }
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel booking if user goes back
  const handleGoBack = async () => {
    if (bookingId && userId) {
      try {
        await supabase.rpc('cancel_booking_simple', {
          p_booking_id: bookingId,
          p_user_id: userId
        });
        console.log('Booking cancelled due to navigation back');
      } catch (error) {
        console.error('Error cancelling booking:', error);
      }
    }
    navigate(-1);
  };

  if (!merchant || !bookingId) {
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
            <CardTitle className="font-righteous">Booking Summary</CardTitle>
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

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={selectedPaymentMethod === 'upi' ? 'default' : 'outline'}
                className={`h-20 flex flex-col items-center space-y-2 font-poppins ${
                  selectedPaymentMethod === 'upi' ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                }`}
                onClick={() => setSelectedPaymentMethod('upi')}
              >
                <Smartphone className="h-6 w-6" />
                <span>UPI</span>
              </Button>
              
              <Button
                variant={selectedPaymentMethod === 'card' ? 'default' : 'outline'}
                className={`h-20 flex flex-col items-center space-y-2 font-poppins ${
                  selectedPaymentMethod === 'card' ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                }`}
                onClick={() => setSelectedPaymentMethod('card')}
              >
                <CreditCard className="h-6 w-6" />
                <span>Card</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Message */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-green-800 text-sm font-poppins">
              ✓ Your time slot is booked! Complete payment to confirm your booking.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing Payment...' : `Pay ₹${totalPrice}`}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
