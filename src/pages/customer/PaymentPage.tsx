
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Store, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';

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
        service_id: selectedServices[0].id,
        staff_id: selectedStaff,
        date: bookingDate,
        time_slot: bookingTime,
        status: 'pending',
        payment_status: 'pending',
        stylist_name: selectedStaffDetails?.name || null
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
          await supabase.from('bookings').delete().eq('id', booking.id);
          throw new Error('Failed to book time slot');
        }

        console.log('Slots booked:', slotResult);

        const typedResult = slotResult as unknown as SlotBookingResult;
        
        if (!typedResult.success) {
          await supabase.from('bookings').delete().eq('id', booking.id);
          throw new Error(typedResult.error || 'Failed to book time slot');
        }
      }

      // Create payment record for "Pay on Shop"
      const paymentData = {
        booking_id: booking.id,
        amount: totalPrice,
        method: 'pay_on_shop',
        status: 'pending'
      };

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        if (selectedStaff) {
          await supabase.rpc('release_stylist_slots', { p_booking_id: booking.id });
        }
        await supabase.from('bookings').delete().eq('id', booking.id);
        throw new Error('Failed to process payment');
      }

      // Update booking status to confirmed
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          payment_status: 'pending'
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
            payment_status: 'pending'
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
    <div className="pb-24 bg-gray-50 min-h-screen">
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
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 text-lg flex items-center">
              <Store className="h-5 w-5 mr-2 text-booqit-primary" />
              Booking Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Shop:</span>
                <span className="font-medium">{merchant.shop_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{bookingDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatTimeToAmPm(bookingTime)}
                </span>
              </div>
              {selectedStaffDetails && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Stylist:</span>
                  <span className="font-medium">{selectedStaffDetails.name}</span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Services:</span>
                <div className="text-right">
                  {selectedServices.map((service: any) => (
                    <div key={service.id} className="font-medium">{service.name}</div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total Amount:</span>
                  <span className="text-booqit-primary">₹{totalPrice}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 text-lg">Payment Method</h3>
            
            {/* Pay on Shop - Available */}
            <Card className="border-2 border-booqit-primary bg-booqit-primary/5 mb-3">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <Store className="h-6 w-6 mr-3 text-booqit-primary" />
                  <div>
                    <span className="font-medium">Pay at Shop</span>
                    <p className="text-sm text-gray-600">Pay when you visit the shop</p>
                  </div>
                </div>
                <div className="bg-booqit-primary text-white px-3 py-1 rounded-full text-xs font-medium">
                  Available
                </div>
              </CardContent>
            </Card>
            
            {/* Online Payment - Coming Soon */}
            <Card className="border border-gray-200 bg-gray-50 opacity-60">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-6 w-6 mr-3 bg-gray-300 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-500">💳</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Online Payment</span>
                    <p className="text-sm text-gray-400">UPI, Cards, Wallets</p>
                  </div>
                </div>
                <div className="bg-gray-300 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                  Coming Soon
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Important Note */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-orange-800 mb-2">📋 Important Note</h4>
            <p className="text-sm text-orange-700">
              Your booking is confirmed! Please arrive on time and pay the amount at the shop. 
              You can cancel or reschedule up to 2 hours before your appointment.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 shadow-lg"
          size="lg"
          onClick={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <div className="flex items-center">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Processing...
            </div>
          ) : (
            `Confirm Booking - ₹${totalPrice}`
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
