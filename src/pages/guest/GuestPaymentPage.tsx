import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Check, Clock, User, MapPin, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';

// Type for the RPC response
interface BookingResponse {
  success: boolean;
  booking_id?: string;
  error?: string;
  message?: string;
}

const GuestPaymentPage: React.FC = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    merchant, 
    selectedServices, 
    totalPrice, 
    totalDuration, 
    selectedStaff,
    selectedStaffDetails,
    bookingDate, 
    bookingTime, 
    guestInfo 
  } = location.state || {};

  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmBooking = async () => {
    if (!merchantId || !selectedServices || !guestInfo) {
      toast.error('Missing booking information');
      return;
    }

    setIsProcessing(true);

    try {
      const serviceIds = selectedServices.map((service: any) => service.id);

      console.log('GUEST PAYMENT: Creating booking with data:', {
        guestInfo,
        merchantId,
        serviceIds,
        selectedStaff: selectedStaff || null,
        bookingDate,
        bookingTime,
        totalDuration
      });

      // Use a simpler approach - call the RPC function with proper error handling
      const { data, error } = await supabase.rpc('create_guest_booking_safe', {
        p_guest_name: guestInfo.name,
        p_guest_phone: guestInfo.phone,
        p_guest_email: guestInfo.email || null,
        p_merchant_id: merchantId,
        p_service_ids: serviceIds,
        p_staff_id: selectedStaff || null,
        p_date: bookingDate,
        p_time_slot: bookingTime,
        p_total_duration: totalDuration || 30
      });

      if (error) {
        console.error('GUEST PAYMENT: RPC error:', error);
        toast.error(`Booking failed: ${error.message}`);
        return;
      }

      console.log('GUEST PAYMENT: RPC response:', data);

      // Handle the response properly with type checking
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const response = data as BookingResponse;
        
        if (response.success && response.booking_id) {
          console.log('GUEST PAYMENT: Booking created successfully:', response.booking_id);
          toast.success('Booking confirmed successfully!');
          
          // Navigate to success page
          navigate(`/guest-booking-success/${merchantId}`, {
            state: { 
              bookingId: response.booking_id,
              merchant,
              selectedServices,
              totalPrice,
              bookingDate,
              bookingTime,
              guestInfo,
              selectedStaffDetails: selectedStaffDetails || { name: 'Any Available Stylist' }
            },
            replace: true
          });
        } else {
          console.error('GUEST PAYMENT: Booking failed:', response.error || 'Unknown error');
          toast.error(response.error || 'Failed to create booking');
        }
      } else {
        console.error('GUEST PAYMENT: Unexpected response format:', data);
        toast.error('Unexpected response from server');
      }
    } catch (error) {
      console.error('GUEST PAYMENT: Critical error:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!merchant || !selectedServices || !guestInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Booking Information Missing</h1>
          <p className="text-gray-600">Please start the booking process again.</p>
          <Button 
            onClick={() => navigate(`/book/${merchantId}`)}
            className="mt-4"
          >
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute left-0 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium font-righteous">Confirm Booking</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Booking Summary */}
        <Card className="border-booqit-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold font-righteous">Ready to Confirm</h3>
                <p className="text-gray-600 font-poppins">Review your booking details</p>
              </div>
            </div>

            {/* Guest Info */}
            <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium font-poppins">Guest Information</span>
              </div>
              <div className="text-sm text-gray-600 font-poppins">
                <p><strong>Name:</strong> {guestInfo.name}</p>
                <p><strong>Phone:</strong> {guestInfo.phone}</p>
                {guestInfo.email && <p><strong>Email:</strong> {guestInfo.email}</p>}
              </div>
            </div>

            {/* Shop Info */}
            <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium font-poppins">Shop Details</span>
              </div>
              <div className="text-sm text-gray-600 font-poppins">
                <p><strong>{merchant.shop_name}</strong></p>
                <p>{merchant.address}</p>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium font-righteous">Selected Services</h4>
              {selectedServices.map((service: any) => (
                <div key={service.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium font-poppins">{service.name}</span>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>{service.duration} min</span>
                    </div>
                  </div>
                  <span className="font-semibold text-booqit-primary">₹{service.price}</span>
                </div>
              ))}
            </div>

            {/* Appointment Details */}
            <div className="space-y-3 mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium font-poppins">Appointment Details</span>
              </div>
              <div className="text-sm text-gray-700 font-poppins">
                <p><strong>Date:</strong> {formatDateInIST(new Date(bookingDate), 'EEE, MMM d, yyyy')}</p>
                <p><strong>Time:</strong> {formatTimeToAmPm(bookingTime)}</p>
                <p><strong>Duration:</strong> {totalDuration} minutes</p>
                <p><strong>Stylist:</strong> {selectedStaffDetails?.name || 'Any Available Stylist'}</p>
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span className="font-poppins">Total Amount:</span>
                <span className="text-booqit-primary">₹{totalPrice}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                <span className="font-poppins">Total Duration:</span>
                <span>{totalDuration} minutes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mt-1">
                <span className="text-yellow-600 text-sm font-bold">!</span>
              </div>
              <div>
                <h4 className="font-medium text-yellow-800 font-righteous">Payment Information</h4>
                <p className="text-sm text-yellow-700 font-poppins mt-1">
                  Payment will be collected at the salon after your service. 
                  Your booking will be confirmed immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handleConfirmBooking}
          disabled={isProcessing}
        >
          {isProcessing ? 'Confirming...' : 'Confirm Booking - Pay at Salon'}
        </Button>
      </div>
    </div>
  );
};

export default GuestPaymentPage;
