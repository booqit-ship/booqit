
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';

interface AvailabilityResponse {
  available: boolean;
  reason?: string;
  conflicting_slot?: string;
}

const PaymentPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth(); // Use userId instead of user
  
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

  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!merchant || !selectedServices || !bookingDate || !bookingTime) {
      toast.error('Missing booking information');
      navigate(-1);
    }
  }, []);

  const handlePayment = async () => {
    if (!userId) {
      toast.error('Please login to complete booking');
      return;
    }

    setProcessing(true);

    try {
      // Final slot availability check before booking
      const { data: finalCheck, error: checkError } = await supabase.rpc('check_slot_availability_with_service_duration', {
        p_staff_id: selectedStaff,
        p_date: bookingDate,
        p_start_time: bookingTime,
        p_service_duration: totalDuration
      });

      // Type guard for the response
      const response = finalCheck as AvailabilityResponse;
      
      if (checkError || !response.available) {
        toast.error('Time slot is no longer available. Please go back and select another time.');
        setProcessing(false);
        return;
      }

      // Create booking record
      const bookingData = {
        user_id: userId,
        merchant_id: merchantId,
        service_id: selectedServices[0].id, // For now, use first service
        staff_id: selectedStaff,
        date: bookingDate,
        time_slot: bookingTime,
        status: 'pending',
        payment_status: 'pending'
      };

      console.log('Creating booking with data:', bookingData);

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        toast.error('Failed to create booking');
        setProcessing(false);
        return;
      }

      console.log('Booking created:', booking);

      // Create payment record
      const paymentData = {
        booking_id: booking.id,
        method: paymentMethod,
        amount: totalPrice,
        status: 'completed', // Simulating successful payment
        timestamp: new Date().toISOString()
      };

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment:', paymentError);
        toast.error('Payment processing failed');
        setProcessing(false);
        return;
      }

      // Update booking status to confirmed and payment status to completed
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          payment_status: 'completed'
        })
        .eq('id', booking.id);

      if (updateError) {
        console.error('Error updating booking status:', updateError);
        toast.error('Error confirming booking');
        setProcessing(false);
        return;
      }

      toast.success('Booking confirmed successfully!');

      // Navigate to receipt page
      navigate(`/receipt/${booking.id}`, {
        state: {
          booking: {
            ...booking,
            status: 'confirmed',
            payment_status: 'completed'
          },
          payment,
          merchant,
          selectedServices,
          selectedStaffDetails,
          totalPrice,
          totalDuration
        }
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!merchant || !selectedServices) {
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
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">Payment</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Shop</span>
              <span className="font-medium">{merchant.shop_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date</span>
              <span className="font-medium">
                {formatDateInIST(new Date(bookingDate), 'EEE, MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time</span>
              <span className="font-medium">{formatTimeToAmPm(bookingTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stylist</span>
              <span className="font-medium">{selectedStaffDetails?.name || 'Any Available'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration</span>
              <span className="font-medium">{totalDuration} minutes</span>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Services:</h4>
              {selectedServices.map((service: any, index: number) => (
                <div key={index} className="flex justify-between text-sm mb-1">
                  <span>{service.name}</span>
                  <span>₹{service.price}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4 flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>₹{totalPrice}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                  <span>UPI</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  <span>Credit/Debit Card</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Wallet className="h-5 w-5 text-purple-600" />
                  <span>Digital Wallet</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handlePayment}
          disabled={processing}
        >
          {processing ? 'Processing...' : `Pay ₹${totalPrice}`}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
