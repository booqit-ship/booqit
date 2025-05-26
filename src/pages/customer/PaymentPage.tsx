
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CreditCard, Wallet, User, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
        for (let i = 0; i < service.quantity; i++) {
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
        }
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

  if (!merchant || !selectedServices) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-white min-h-screen">
      <div className="relative bg-booqit-primary text-white p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 text-white hover:bg-white/20"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-center text-xl font-medium">Payment</h1>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Booking Summary */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg">Booking Summary</h2>
            <Separator className="my-2" />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Merchant</span>
                <span className="font-medium">{merchant.shop_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium">{bookingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time</span>
                <span className="font-medium">{bookingTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">{totalDuration} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Services</span>
                <span className="font-medium">{selectedServices.length} service(s)</span>
              </div>
              {selectedStaff && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Stylist</span>
                  <span className="font-medium">Selected</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-lg font-medium">
                <span>Total</span>
                <span>₹{totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Methods */}
        <div>
          <h2 className="text-lg font-medium mb-3">Select Payment Method</h2>
          
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
        </div>
        
        {/* Cash payment info */}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-gray-600">Pay the amount directly at the service location</p>
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
