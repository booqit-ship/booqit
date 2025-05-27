import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SlotBookingResult {
  success: boolean;
  error?: string;
  slots_booked?: number;
}

const PaymentPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'upi'>('card');

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

  const handlePayment = async () => {
    if (!userId) {
      toast.error('Please log in to continue');
      navigate('/auth');
      return;
    }

    if (!merchant || !selectedServices || !bookingDate || !bookingTime) {
      toast.error('Booking information is missing');
      navigate(-1);
      return;
    }

    setProcessing(true);

    try {
      console.log('Processing booking with:', {
        userId,
        merchantId,
        selectedServices,
        selectedStaff,
        bookingDate,
        bookingTime,
        totalDuration
      });

      // Create the booking first
      const bookingData = {
        user_id: userId,
        merchant_id: merchantId,
        service_id: selectedServices[0].id, // Use first service for now
        staff_id: selectedStaff,
        date: bookingDate,
        time_slot: bookingTime,
        status: 'pending',
        payment_status: 'pending'
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        console.error('Booking creation error:', bookingError);
        throw new Error('Failed to create booking');
      }

      console.log('Booking created:', booking);

      // Book the stylist slots using the new function
      if (selectedStaff) {
        const { data: slotResult, error: slotError } = await supabase.rpc('book_stylist_slot', {
          p_staff_id: selectedStaff,
          p_date: bookingDate,
          p_time_slot: bookingTime,
          p_booking_id: booking.id,
          p_service_duration: totalDuration
        });

        if (slotError) {
          console.error('Slot booking error:', slotError);
          // Delete the booking if slot booking fails
          await supabase.from('bookings').delete().eq('id', booking.id);
          throw new Error('Failed to book time slot');
        }

        console.log('Slots booked:', slotResult);

        // Type the result properly
        const typedResult = slotResult as SlotBookingResult;
        
        if (!typedResult.success) {
          // Delete the booking if slot booking fails
          await supabase.from('bookings').delete().eq('id', booking.id);
          throw new Error(typedResult.error || 'Failed to book time slot');
        }
      }

      // Create payment record
      const paymentData = {
        booking_id: booking.id,
        amount: totalPrice,
        method: selectedPaymentMethod,
        status: 'completed'
      };

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        // Release slots and delete booking if payment fails
        if (selectedStaff) {
          await supabase.rpc('release_stylist_slots', { p_booking_id: booking.id });
        }
        await supabase.from('bookings').delete().eq('id', booking.id);
        throw new Error('Failed to process payment');
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
        console.error('Booking update error:', updateError);
      }

      toast.success('Booking confirmed successfully!');
      
      navigate(`/receipt/${booking.id}`, {
        state: {
          booking: {
            ...booking,
            status: 'confirmed',
            payment_status: 'completed'
          },
          merchant,
          selectedServices,
          selectedStaffDetails,
          payment: paymentData
        }
      });

    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast.error(error.message || 'Failed to process booking. Please try again.');
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

      <div className="p-4">
        {/* Booking Summary */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Shop:</span>
                <span className="font-medium">{merchant.shop_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{bookingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{bookingTime}</span>
              </div>
              {selectedStaffDetails && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Stylist:</span>
                  <span className="font-medium">{selectedStaffDetails.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Services:</span>
                <div className="text-right">
                  {selectedServices.map((service: any) => (
                    <div key={service.id} className="font-medium">{service.name}</div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total:</span>
                <span>₹{totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Select Payment Method</h3>
          <div className="space-y-3">
            <Card 
              className={`cursor-pointer transition-colors ${
                selectedPaymentMethod === 'card' ? 'ring-2 ring-booqit-primary' : ''
              }`}
              onClick={() => setSelectedPaymentMethod('card')}
            >
              <CardContent className="p-4 flex items-center">
                <CreditCard className="h-6 w-6 mr-3 text-booqit-primary" />
                <span className="font-medium">Credit/Debit Card</span>
              </CardContent>
            </Card>
            
            <Card 
              className={`cursor-pointer transition-colors ${
                selectedPaymentMethod === 'upi' ? 'ring-2 ring-booqit-primary' : ''
              }`}
              onClick={() => setSelectedPaymentMethod('upi')}
            >
              <CardContent className="p-4 flex items-center">
                <Smartphone className="h-6 w-6 mr-3 text-booqit-primary" />
                <span className="font-medium">UPI</span>
              </CardContent>
            </Card>
          </div>
        </div>
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
