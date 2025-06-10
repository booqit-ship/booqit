import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, CreditCard, Clock, User, Store, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeToAmPm, timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import { format } from 'date-fns';
import { sendNewBookingNotification } from '@/services/eventNotificationService';

interface LocationState {
  merchant: any;
  date: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  selectedServices: any[];
  selectedStaffDetails: any;
  totalPrice: number;
  totalDuration: number;
}

interface BookingResult {
  booking_id: string;
  booking_data: any;
}

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);

  // Parse data from navigation state
  const { merchant, date, timeSlot, customerName, customerPhone, selectedServices, selectedStaffDetails, totalPrice, totalDuration } = location.state as LocationState;

  const handlePayAtShop = async () => {
    if (!userId) {
      console.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      console.log('📝 Creating booking with multiple services...');
      
      const { data: result, error } = await supabase.rpc('reserve_slot_immediately', {
        p_user_id: userId,
        p_merchant_id: merchant.id,
        p_service_id: selectedServices[0]?.id || null,
        p_staff_id: selectedStaffDetails?.id || null,
        p_date: date,
        p_time_slot: timeSlot,
        p_service_duration: totalDuration
      });

      if (error) {
        console.error('❌ Error creating booking:', error);
        throw error;
      }

      console.log('✅ Booking created successfully:', result);

      // Safely handle the result - it might be a string (booking ID) or object
      let bookingId: string;
      let bookingData: any;

      if (typeof result === 'string') {
        bookingId = result;
        bookingData = result;
      } else if (result && typeof result === 'object' && 'booking_id' in result) {
        bookingId = (result as any).booking_id;
        bookingData = (result as any).booking_data || result;
      } else {
        // Fallback - use result as both ID and data
        bookingId = String(result);
        bookingData = result;
      }

      // Send notification to merchant
      if (merchant.user_id && bookingId) {
        const timeRange = `${formatTimeToAmPm(timeSlot)} - ${formatTimeToAmPm(minutesToTime(timeToMinutes(timeSlot) + totalDuration))}`;
        const serviceNames = selectedServices.map(s => s.name).join(', ');
        
        console.log('🔔 Sending booking notification to merchant:', merchant.user_id);
        await sendNewBookingNotification(
          merchant.user_id,
          customerName,
          serviceNames,
          `${format(new Date(date), 'MMM d')} at ${timeRange}`,
          bookingId
        );
      }

      // Navigate to receipt page with booking data
      navigate(`/receipt/${bookingId}`, {
        state: {
          booking: bookingData,
          merchant,
          selectedServices,
          selectedStaffDetails,
          payment: { method: 'pay_at_shop', status: 'pending' }
        },
        replace: true
      });

    } catch (error) {
      console.error('❌ Error in payment process:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
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

      <div className="container mx-auto p-4">
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4 mb-4">
              <Store className="h-6 w-6 text-gray-500" />
              <div>
                <div className="font-medium">{merchant?.shop_name}</div>
                <div className="text-sm text-gray-500">{merchant?.address}</div>
              </div>
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <Calendar className="h-6 w-6 text-gray-500" />
              <div>
                <div className="font-medium">{format(new Date(date), 'EEE, MMM d, yyyy')}</div>
                <div className="text-sm text-gray-500">
                  <Clock className="h-4 w-4 inline-block mr-1" />
                  {formatTimeToAmPm(timeSlot)} - {formatTimeToAmPm(minutesToTime(timeToMinutes(timeSlot) + totalDuration))} ({totalDuration} minutes)
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <User className="h-6 w-6 text-gray-500" />
              <div>
                <div className="font-medium">Customer Details</div>
                <div className="text-sm text-gray-500">Name: {customerName}</div>
                <div className="text-sm text-gray-500">Phone: {customerPhone}</div>
              </div>
            </div>
            <div className="mb-4">
              <div className="font-medium">Services</div>
              {selectedServices.map((service, index) => (
                <div key={index} className="text-sm text-gray-500">- {service.name} ({service.duration} min) - ₹{service.price}</div>
              ))}
            </div>
            <div className="font-semibold text-xl">Total: ₹{totalPrice}</div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 mt-4">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Payment Options</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Button 
              className="w-full mb-4" 
              onClick={handlePayAtShop} 
              disabled={loading}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay at Shop
            </Button>
            <p className="text-center text-gray-500">We also accept UPI, cards, and cash at the shop.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentPage;
