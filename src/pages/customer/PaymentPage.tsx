
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, User, MapPin, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';

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
    bookingTime 
  } = location.state || {};

  console.log('PAYMENT_PAGE: Location state:', {
    merchant,
    selectedServices,
    totalPrice,
    totalDuration,
    selectedStaff,
    bookingDate,
    bookingTime
  });

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Validate required data
  useEffect(() => {
    if (!merchant || !selectedServices || !Array.isArray(selectedServices) || selectedServices.length === 0) {
      console.error('PAYMENT_PAGE: Missing required booking data');
      toast.error('Missing booking information. Please start over.');
      navigate(-1);
      return;
    }

    if (!bookingDate || !bookingTime || !selectedStaff || !totalDuration) {
      console.error('PAYMENT_PAGE: Missing booking details');
      toast.error('Missing booking details. Please select a time slot again.');
      navigate(-1);
      return;
    }
  }, [merchant, selectedServices, bookingDate, bookingTime, selectedStaff, totalDuration, navigate]);

  const handlePayment = async () => {
    if (!userId || !merchantId) {
      toast.error('Please log in to complete booking');
      return;
    }

    setIsProcessingPayment(true);

    try {
      console.log('PAYMENT_PROCESS: Creating booking with services:', {
        userId,
        merchantId,
        staffId: selectedStaff,
        date: bookingDate,
        timeSlot: bookingTime,
        services: selectedServices,
        totalDuration
      });

      // Create booking with all services and correct total duration
      const { data, error } = await supabase.rpc('create_booking_with_services', {
        p_user_id: userId,
        p_merchant_id: merchantId,
        p_staff_id: selectedStaff,
        p_date: bookingDate,
        p_time_slot: bookingTime,
        p_services: selectedServices,
        p_total_duration: totalDuration
      });

      if (error) {
        console.error('PAYMENT_PROCESS: Booking creation error:', error);
        toast.error(error.message || 'Failed to create booking');
        return;
      }

      if (!data?.success) {
        console.error('PAYMENT_PROCESS: Booking creation failed:', data);
        toast.error(data?.error || 'Failed to create booking');
        return;
      }

      const bookingId = data.booking_id;
      console.log('PAYMENT_PROCESS: Booking created successfully:', bookingId);

      // For now, we'll simulate payment success and confirm the booking
      const { error: confirmError } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: bookingId,
        p_user_id: userId
      });

      if (confirmError) {
        console.error('PAYMENT_PROCESS: Payment confirmation error:', confirmError);
        toast.error('Failed to confirm payment');
        return;
      }

      console.log('PAYMENT_PROCESS: Payment confirmed, redirecting to receipt');
      toast.success('Booking confirmed successfully!');

      // Navigate to receipt page with booking details
      navigate(`/receipt/${bookingId}`, {
        state: {
          bookingId,
          merchant,
          selectedServices,
          totalPrice,
          totalDuration,
          selectedStaffDetails,
          bookingDate,
          bookingTime
        }
      });

    } catch (error) {
      console.error('PAYMENT_PROCESS: Catch block error:', error);
      toast.error('Payment processing failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!merchant || !selectedServices) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Loading booking details...</p>
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
          <h1 className="text-xl font-medium font-righteous">Payment</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-booqit-primary" />
              <div>
                <p className="font-medium font-poppins">{merchant.shop_name}</p>
                <p className="text-sm text-gray-600 font-poppins">{merchant.address}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-booqit-primary" />
              <div>
                <p className="font-medium font-poppins">{selectedStaffDetails?.name || 'Staff Member'}</p>
                <p className="text-sm text-gray-600 font-poppins">Stylist</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-booqit-primary" />
              <div>
                <p className="font-medium font-poppins">
                  {formatDateInIST(new Date(bookingDate), 'EEEE, MMM d, yyyy')} at {formatTimeToAmPm(bookingTime)}
                </p>
                <p className="text-sm text-gray-600 font-poppins">Duration: {totalDuration} minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous">Selected Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedServices.map((service: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <p className="font-medium font-poppins">{service.name}</p>
                  <p className="text-sm text-gray-600 font-poppins">
                    {service.duration || service.service_duration} minutes
                  </p>
                </div>
                <p className="font-medium font-poppins">₹{service.price}</p>
              </div>
            ))}
            <div className="border-t pt-3 flex justify-between items-center">
              <p className="font-semibold font-righteous">Total</p>
              <div className="text-right">
                <p className="font-semibold text-lg font-poppins">₹{totalPrice}</p>
                <p className="text-sm text-gray-600 font-poppins">{totalDuration} minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-booqit-primary" />
              <div>
                <p className="font-medium font-poppins">Pay at Store</p>
                <p className="text-sm text-gray-600 font-poppins">Complete payment when you arrive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Booking Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handlePayment}
          disabled={isProcessingPayment}
        >
          {isProcessingPayment ? 'Processing...' : `Confirm Booking - ₹${totalPrice}`}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
