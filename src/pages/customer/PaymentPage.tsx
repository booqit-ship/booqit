
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CreditCard, Wallet, User, MapPin, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PaymentMethod = 'card' | 'upi' | 'wallet' | 'cash';

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

  const handlePayment = async () => {
    if (!user || !merchantId || !selectedServices || !merchant || !bookingDate || !bookingTime) {
      toast.error('Missing required booking information');
      return;
    }

    try {
      setProcessingPayment(true);
      console.log('Starting booking process with data:', {
        user_id: user.id,
        merchant_id: merchantId,
        selectedServices,
        selectedStaff,
        bookingDate,
        bookingTime,
        totalPrice
      });
      
      // Create bookings for each service
      const bookingPromises = selectedServices.map(async (service: any) => {
        const bookingData = {
          user_id: user.id,
          merchant_id: merchantId,
          service_id: service.id,
          staff_id: selectedStaff || null,
          date: bookingDate,
          time_slot: bookingTime,
          status: 'confirmed',
          payment_status: 'pending',
        };

        console.log('Creating booking with data:', bookingData);

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single();
        
        if (bookingError) {
          console.error('Booking creation error:', bookingError);
          throw bookingError;
        }

        console.log('Booking created successfully:', booking);
        
        // Create payment record for each booking
        const paymentData = {
          booking_id: booking.id,
          method: paymentMethod,
          amount: service.price,
          status: 'pending',
        };

        console.log('Creating payment with data:', paymentData);

        const { error: paymentError } = await supabase
          .from('payments')
          .insert(paymentData);
        
        if (paymentError) {
          console.error('Payment creation error:', paymentError);
          throw paymentError;
        }

        console.log('Payment record created successfully');
        return booking;
      });

      const bookings = await Promise.all(bookingPromises);
      
      console.log('All bookings created:', bookings);
      toast.success('Booking confirmed successfully!');
      
      navigate(`/receipt/${bookings[0]?.id}`, {
        state: {
          merchant,
          selectedServices,
          totalPrice,
          totalDuration,
          selectedStaff,
          selectedStaffDetails,
          bookingDate,
          bookingTime,
          bookingIds: bookings.map(b => b?.id).filter(Boolean),
          paymentMethod
        }
      });
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Booking failed. Please try again.');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="relative flex items-center justify-center max-w-md mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-0 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Booking Summary</h1>
        </div>
      </div>
      
      <div className="max-w-md mx-auto pb-24">
        {/* Merchant Info */}
        <div className="bg-white p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-booqit-primary/10 rounded-full flex items-center justify-center">
              <span className="font-bold text-booqit-primary text-lg">
                {merchant.shop_name.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{merchant.shop_name}</h3>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="line-clamp-1">{merchant.address}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Selected Services */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Selected Services
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {selectedServices.map((service: any, index: number) => (
                  <div key={service.id || index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{service.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{service.description}</div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{service.duration} minutes</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-gray-900">₹{service.price}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total ({totalDuration} minutes)</span>
                <span className="font-bold text-lg text-booqit-primary">₹{totalPrice}</span>
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Date & Time</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3 text-booqit-primary" />
                  <span className="font-medium">{formatDate(bookingDate)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-3 text-booqit-primary" />
                  <span className="font-medium">{bookingTime} ({totalDuration} minutes)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stylist */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your Stylist</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center">
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarFallback className="bg-booqit-primary/10 text-booqit-primary font-semibold">
                    {selectedStaffDetails ? selectedStaffDetails.name.charAt(0) : 'A'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-gray-900">
                    {selectedStaffDetails ? selectedStaffDetails.name : 'Any Available Stylist'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedStaffDetails ? 'Your selected stylist' : 'We\'ll assign the best available stylist'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Payment Methods */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                className="space-y-3"
              >
                <Label
                  htmlFor="cash-option"
                  className="flex items-center p-3 border rounded-lg cursor-pointer transition-colors border-booqit-primary bg-booqit-primary/5"
                >
                  <RadioGroupItem value="cash" id="cash-option" className="mr-3" checked />
                  <span className="mr-3 text-gray-600 font-bold text-lg">₹</span>
                  <div>
                    <span className="font-medium">Pay at Salon</span>
                    <div className="text-sm text-gray-500">Cash payment on arrival</div>
                  </div>
                </Label>
                
                <Label
                  htmlFor="card-option"
                  className="flex items-center p-3 border rounded-lg cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                >
                  <RadioGroupItem value="card" id="card-option" className="mr-3" disabled />
                  <CreditCard className="h-5 w-5 mr-3 text-gray-400" />
                  <div className="flex-1">
                    <span className="text-gray-400">Credit/Debit Card</span>
                    <div className="text-xs text-gray-400">Coming Soon</div>
                  </div>
                </Label>
                
                <Label
                  htmlFor="upi-option"
                  className="flex items-center p-3 border rounded-lg cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                >
                  <RadioGroupItem value="upi" id="upi-option" className="mr-3" disabled />
                  <User className="h-5 w-5 mr-3 text-gray-400" />
                  <div className="flex-1">
                    <span className="text-gray-400">UPI Payment</span>
                    <div className="text-xs text-gray-400">Coming Soon</div>
                  </div>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>
          
          {/* Payment Info */}
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium">Payment on Arrival</p>
                  <p className="text-amber-700 text-sm mt-1">
                    You will pay ₹{totalPrice} in cash when you arrive for your appointment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto p-4">
          <Button 
            className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-white font-semibold py-4 text-lg shadow-lg"
            size="lg"
            onClick={handlePayment}
            disabled={processingPayment}
          >
            {processingPayment ? (
              <div className="flex items-center">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                Processing Booking...
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
