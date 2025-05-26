
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CreditCard, Wallet, User, MapPin, Calendar, Clock, Users } from 'lucide-react';
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
  } = location.state;

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
    
    if (!merchant || !selectedServices) {
      toast.error('Booking information missing');
      navigate(-1);
    }
  }, [navigate, merchant, selectedServices]);

  const handlePayment = async () => {
    if (!user || !merchantId || !selectedServices || !merchant) {
      toast.error('Missing required information');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Create bookings for each service
      const bookingPromises = selectedServices.map(async (service: any) => {
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            user_id: user.id,
            merchant_id: merchantId,
            service_id: service.id,
            staff_id: selectedStaff,
            date: bookingDate,
            time_slot: bookingTime,
            status: 'confirmed',
            payment_status: 'pending',
          })
          .select()
          .single();
        
        if (bookingError) throw bookingError;
        
        // Create payment record for each booking
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            booking_id: bookingData.id,
            method: 'cash',
            amount: service.price,
            status: 'pending',
          });
        
        if (paymentError) throw paymentError;
        
        return bookingData;
      });

      const bookings = await Promise.all(bookingPromises);
      
      toast.success('Booking confirmed!');
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
          paymentMethod: 'cash'
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

  if (!merchant || !selectedServices) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
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
          <h1 className="text-xl font-medium">Booking Details & Payment</h1>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Merchant Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-booqit-primary/10 rounded-lg flex items-center justify-center">
                <span className="font-semibold text-booqit-primary">
                  {merchant.shop_name.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">{merchant.shop_name}</h3>
                <div className="flex items-center text-gray-500 text-sm">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span>{merchant.address}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedServices.map((service: any) => (
                <div key={service.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-gray-500">{service.description}</div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{service.duration} mins</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">₹{service.price}</div>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between font-semibold">
              <span>Total ({totalDuration} minutes)</span>
              <span>₹{totalPrice}</span>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date & Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-3 text-gray-500" />
                <span>{formatDate(bookingDate)}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-3 text-gray-500" />
                <span>{bookingTime} ({totalDuration} minutes)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stylist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stylist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarFallback className="bg-gray-200 text-gray-700">
                  {selectedStaffDetails ? selectedStaffDetails.name.charAt(0) : 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {selectedStaffDetails ? selectedStaffDetails.name : 'Any Available Stylist'}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedStaffDetails ? 'Your preferred choice' : 'We\'ll assign the best available stylist'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="space-y-3"
            >
              {/* Cash on Service - Only enabled option */}
              <Label
                htmlFor="cash-option"
                className="flex items-center p-4 border rounded-lg cursor-pointer transition-colors border-booqit-primary bg-booqit-primary/5"
              >
                <RadioGroupItem value="cash" id="cash-option" className="mr-3" checked />
                <span className="mr-3 text-gray-600 font-medium">₹</span>
                <span>Cash on Service</span>
              </Label>
              
              {/* Other payment methods - disabled */}
              <Label
                htmlFor="card-option"
                className="flex items-center p-4 border rounded-lg cursor-not-allowed border-gray-200 bg-gray-50"
              >
                <RadioGroupItem value="card" id="card-option" className="mr-3" disabled />
                <CreditCard className="h-5 w-5 mr-3 text-gray-400" />
                <span className="text-gray-400">Credit/Debit Card</span>
                <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded">Coming Soon</span>
              </Label>
              
              <Label
                htmlFor="upi-option"
                className="flex items-center p-4 border rounded-lg cursor-not-allowed border-gray-200 bg-gray-50"
              >
                <RadioGroupItem value="upi" id="upi-option" className="mr-3" disabled />
                <User className="h-5 w-5 mr-3 text-gray-400" />
                <span className="text-gray-400">UPI</span>
                <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded">Coming Soon</span>
              </Label>
              
              <Label
                htmlFor="wallet-option"
                className="flex items-center p-4 border rounded-lg cursor-not-allowed border-gray-200 bg-gray-50"
              >
                <RadioGroupItem value="wallet" id="wallet-option" className="mr-3" disabled />
                <Wallet className="h-5 w-5 mr-3 text-gray-400" />
                <span className="text-gray-400">Digital Wallet</span>
                <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded">Coming Soon</span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>
        
        {/* Cash payment info */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <p className="text-amber-800">You will pay ₹{totalPrice} in cash when you arrive for your appointment.</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handlePayment}
          disabled={processingPayment}
        >
          {processingPayment ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Processing...
            </>
          ) : (
            `Confirm Booking - ₹{totalPrice}`
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
