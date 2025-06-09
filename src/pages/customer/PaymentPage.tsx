
import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';

const PaymentPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  
  const { 
    merchant, 
    selectedServices, 
    selectedStaff, 
    selectedDate, 
    selectedTime, 
    totalPrice, 
    totalDuration 
  } = location.state;

  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!userId) {
      toast.error('Please log in to complete booking');
      return;
    }

    try {
      setIsProcessing(true);

      // Create booking with multiple services support
      const bookingData = {
        user_id: userId,
        merchant_id: merchantId,
        service_id: selectedServices[0].id, // Keep for compatibility
        staff_id: selectedStaff.id,
        date: selectedDate,
        time_slot: selectedTime,
        status: 'confirmed',
        payment_status: 'completed',
        services: selectedServices.map(service => ({
          id: service.id,
          name: service.name,
          price: service.price,
          duration: service.duration
        })),
        total_duration: totalDuration
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select('id')
        .single();

      if (bookingError) {
        throw bookingError;
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: booking.id,
          method: paymentMethod,
          amount: totalPrice,
          status: 'completed'
        });

      if (paymentError) {
        console.error('Payment record error:', paymentError);
        // Don't fail the booking if payment record fails
      }

      toast.success('Booking confirmed successfully!');
      navigate(`/receipt/${booking.id}`);

    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to complete booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

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

      <div className="p-4">
        {/* Booking Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Shop</span>
              <span className="font-medium">{merchant.shop_name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Stylist</span>
              <span className="font-medium">{selectedStaff.name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Date & Time</span>
              <span className="font-medium">
                {selectedDate} at {formatTimeToAmPm(selectedTime)}
              </span>
            </div>

            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium">Services</h4>
              {selectedServices.map((service, index) => (
                <div key={service.id} className="flex justify-between text-sm">
                  <span>{service.name} ({service.duration} min)</span>
                  <span>₹{service.price}</span>
                </div>
              ))}
            </div>

            <Separator />
            
            <div className="flex justify-between">
              <span className="text-gray-600">Total Duration</span>
              <span className="font-medium">{totalDuration} minutes</span>
            </div>
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Total Amount</span>
              <span>₹{totalPrice}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi" className="flex items-center cursor-pointer">
                  <Smartphone className="h-4 w-4 mr-2" />
                  UPI Payment
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center cursor-pointer">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Credit/Debit Card
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
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : `Pay ₹${totalPrice}`}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
