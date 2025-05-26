import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CreditCard, Wallet, User, MapPin, Calendar, Clock, CheckCircle, AlertCircle, Star, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet';

const PaymentPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
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
    bookingTime 
  } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [user, setUser] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  console.log('PaymentPage state:', {
    merchant,
    selectedServices,
    totalPrice,
    totalDuration,
    selectedStaff,
    selectedStaffDetails,
    bookingDate,
    bookingTime
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please log in to continue');
          navigate('/auth');
          return;
        }
        setUser(user);
        console.log('Authenticated user:', user);
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed');
        navigate('/auth');
      }
    };
    
    checkAuth();
    
    if (!merchant || !selectedServices || !totalPrice || !bookingDate || !bookingTime) {
      console.error('Missing booking data:', { merchant, selectedServices, totalPrice, bookingDate, bookingTime });
      toast.error('Booking information missing. Please start over.');
      navigate(`/merchant/${merchantId}`);
    }
  }, [navigate, merchant, selectedServices, totalPrice, bookingDate, bookingTime, merchantId]);

  const checkTimeSlotAvailability = async (date: string, timeSlot: string, staffId?: string) => {
    try {
      console.log('Checking availability for:', { date, timeSlot, staffId, merchantId });
      
      let query = supabase
        .from('bookings')
        .select('id, status')
        .eq('merchant_id', merchantId)
        .eq('date', date)
        .eq('time_slot', timeSlot)
        .in('status', ['confirmed', 'pending']);

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error checking availability:', error);
        return false;
      }

      console.log('Existing bookings for slot:', data);
      return data.length === 0;
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      return false;
    }
  };

  const handlePayment = async () => {
    if (!user || !merchantId || !selectedServices || !merchant || !bookingDate || !bookingTime) {
      toast.error('Missing required booking information');
      return;
    }

    if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
      toast.error('No services selected');
      return;
    }

    if (!totalPrice || totalPrice <= 0) {
      toast.error('Invalid total price');
      return;
    }

    try {
      setProcessingPayment(true);
      console.log('Starting booking process...');

      // Check availability before creating booking
      const isAvailable = await checkTimeSlotAvailability(bookingDate, bookingTime, selectedStaff);
      if (!isAvailable) {
        toast.error('This time slot is no longer available. Please select a different time.');
        setProcessingPayment(false);
        return;
      }
      
      console.log('Time slot is available, proceeding with booking...');
      
      // Create a single booking for all services
      const bookingData = {
        user_id: user.id,
        merchant_id: merchantId,
        service_id: selectedServices[0].id, // Use first service as primary
        staff_id: selectedStaff || null,
        date: bookingDate,
        time_slot: bookingTime,
        status: 'confirmed' as const,
        payment_status: 'pending' as const,
      };

      console.log('Creating booking with data:', bookingData);

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();
      
      if (bookingError) {
        console.error('Booking creation error:', bookingError);
        throw new Error(`Failed to create booking: ${bookingError.message}`);
      }

      console.log('Booking created successfully:', booking);
      
      // Create a single payment record for the total amount
      // Using a more permissive approach - let's insert directly without complex validation
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: booking.id,
          method: paymentMethod,
          amount: totalPrice,
          status: 'pending' as const,
        })
        .select()
        .single();
      
      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        // If payment fails, rollback the booking
        try {
          await supabase.from('bookings').delete().eq('id', booking.id);
          console.log('Rolled back booking due to payment failure');
        } catch (rollbackError) {
          console.error('Failed to rollback booking:', rollbackError);
        }
        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }

      console.log('Payment record created successfully:', payment);
      
      // Update booking payment status to completed for cash payments
      if (paymentMethod === 'cash') {
        const { error: updateError } = await supabase
          .from('payments')
          .update({ status: 'completed' })
          .eq('id', payment.id);
        
        if (updateError) {
          console.error('Error updating payment status:', updateError);
        }
      }
      
      console.log('Booking and payment created successfully');
      toast.success('Booking confirmed successfully!');
      
      // Navigate to receipt page with booking data
      navigate(`/receipt/${booking.id}`, {
        state: {
          merchant,
          selectedServices,
          totalPrice,
          totalDuration,
          selectedStaff,
          selectedStaffDetails,
          bookingDate,
          bookingTime,
          bookingIds: [booking.id],
          paymentMethod
        }
      });
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Booking failed. Please try again.');
      setProcessingPayment(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (!merchant || !selectedServices || !totalPrice) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b sticky top-0 z-50">
        <div className="max-w-md mx-auto relative flex items-center justify-center p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-4 text-gray-600 hover:bg-gray-100"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Confirm Booking</h1>
        </div>
      </div>
      
      <div className="max-w-md mx-auto pb-32 p-4 space-y-6">
        {/* Merchant Card */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-booqit-primary to-booqit-primary/90 text-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <span className="font-bold text-white text-xl">
                  {merchant.shop_name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{merchant.shop_name}</h3>
                <div className="flex items-center mt-1 opacity-90">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-sm line-clamp-2">{merchant.address}</span>
                </div>
                <div className="flex items-center mt-1">
                  <Star className="h-4 w-4 mr-1 fill-current" />
                  <span className="text-sm">{merchant.rating || '4.5'} rating</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Summary */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center text-gray-900">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Selected Services
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {selectedServices.map((service: any, index: number) => (
                <div key={service.id || index} className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{service.name}</div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</div>
                    <div className="flex items-center text-sm text-gray-500 mt-2">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{service.duration} minutes</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-bold text-lg text-booqit-primary">₹{service.price}</div>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between items-center p-4 bg-booqit-primary/5 rounded-lg">
              <div>
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <div className="text-sm text-gray-600">{totalDuration} minutes</div>
              </div>
              <span className="font-bold text-2xl text-booqit-primary">₹{totalPrice}</span>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-gray-900">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Date</span>
                </div>
                <span className="font-semibold text-blue-900">{formatDate(bookingDate)}</span>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">Time</span>
                </div>
                <span className="font-semibold text-green-900">{bookingTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stylist Info */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-gray-900">Your Stylist</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center p-4 bg-purple-50 rounded-lg">
              <Avatar className="h-12 w-12 mr-4">
                <AvatarFallback className="bg-purple-200 text-purple-700 font-semibold">
                  {selectedStaffDetails ? selectedStaffDetails.name.charAt(0) : 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-gray-900">
                  {selectedStaffDetails ? selectedStaffDetails.name : 'Any Available Stylist'}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedStaffDetails ? 'Your selected stylist' : 'We\'ll assign the best available stylist'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Method */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-gray-900">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="space-y-3"
            >
              <Label
                htmlFor="cash-option"
                className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all border-booqit-primary bg-booqit-primary/5 hover:bg-booqit-primary/10"
              >
                <RadioGroupItem value="cash" id="cash-option" className="mr-4" checked />
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-green-600 font-bold text-lg">₹</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Pay at Salon</span>
                  <div className="text-sm text-gray-600">Cash payment on arrival</div>
                </div>
              </Label>
              
              <Label
                htmlFor="card-option"
                className="flex items-center p-4 border rounded-lg cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
              >
                <RadioGroupItem value="card" id="card-option" className="mr-4" disabled />
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <span className="text-gray-400 font-medium">Credit/Debit Card</span>
                  <div className="text-xs text-gray-400">Coming Soon</div>
                </div>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>
        
        {/* Payment Info */}
        <Card className="border-amber-200 bg-amber-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-800 font-semibold">Payment on Arrival</p>
                <p className="text-amber-700 text-sm mt-1">
                  You will pay ₹{totalPrice} in cash when you arrive for your appointment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl">
        <div className="max-w-md mx-auto p-4">
          <div className="mb-3 text-center">
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-2xl font-bold text-booqit-primary">₹{totalPrice}</div>
          </div>
          <Button 
            className="w-full bg-gradient-to-r from-booqit-primary to-booqit-primary/90 hover:from-booqit-primary/90 hover:to-booqit-primary text-white font-bold py-4 text-lg shadow-lg rounded-xl"
            size="lg"
            onClick={handlePayment}
            disabled={processingPayment}
          >
            {processingPayment ? (
              <div className="flex items-center">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                Processing...
              </div>
            ) : (
              `Confirm Booking - ₹${totalPrice}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
