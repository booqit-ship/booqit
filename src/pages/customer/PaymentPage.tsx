
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CreditCard, Clock, MapPin, User, Package } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { createBookingWithServices } from '@/utils/bookingUtils';

interface ServiceSelection {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface BookingData {
  merchantId: string;
  merchantName: string;
  merchantAddress: string;
  staffId: string;
  staffName: string;
  services: ServiceSelection[];
  date: string;
  timeSlot: string;
}

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  useEffect(() => {
    const data = location.state?.bookingData;
    if (!data) {
      toast.error('No booking data found');
      navigate('/');
      return;
    }
    setBookingData(data);
  }, [location.state, navigate]);

  const handlePayment = async () => {
    if (!userId || !bookingData) {
      toast.error('Missing required information');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createBookingWithServices(
        userId,
        bookingData.merchantId,
        bookingData.services,
        bookingData.staffId,
        bookingData.date,
        bookingData.timeSlot
      );

      if (result.success) {
        // Confirm the booking payment
        const { error: confirmError } = await supabase.rpc('confirm_booking_payment', {
          p_booking_id: result.bookingId,
          p_user_id: userId
        });

        if (confirmError) {
          console.error('Error confirming payment:', confirmError);
          toast.error('Payment confirmation failed');
          return;
        }

        toast.success('Booking confirmed successfully!');
        navigate(`/receipt/${result.bookingId}`);
      } else {
        toast.error('Failed to create booking');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!bookingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  const totalPrice = bookingData.services.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = bookingData.services.reduce((sum, service) => sum + service.duration, 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-light mb-2">Payment</h1>
        <p className="text-gray-600">Review and confirm your booking</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {bookingData.merchantName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{bookingData.merchantAddress}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-4 w-4" />
            <span className="text-sm">Stylist: {bookingData.staffName}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              {new Date(bookingData.date).toLocaleDateString()} at {formatTimeToAmPm(bookingData.timeSlot)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selected Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bookingData.services.map((service, index) => (
              <div key={service.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-gray-600">{service.duration} minutes</p>
                </div>
                <p className="font-semibold">₹{service.price}</p>
              </div>
            ))}
            
            <Separator className="my-4" />
            
            <div className="flex justify-between items-center font-semibold">
              <div>
                <p>Total ({bookingData.services.length} service{bookingData.services.length > 1 ? 's' : ''})</p>
                <p className="text-sm text-gray-600">{totalDuration} minutes total</p>
              </div>
              <p className="text-lg text-booqit-primary">₹{totalPrice}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 border rounded-lg bg-green-50 border-green-200">
              <p className="font-medium text-green-800">Pay at Shop</p>
              <p className="text-sm text-green-600">Complete payment when you arrive</p>
            </div>
            
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
              size="lg"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                `Confirm Booking - ₹${totalPrice}`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPage;
