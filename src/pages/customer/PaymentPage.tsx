
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CreditCard, Wallet, User, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PaymentMethod = 'card' | 'upi' | 'wallet' | 'cash';

interface BookingDetails {
  bookingDate: string;
  bookingTime: string;
  staffId: string | null;
  serviceName: string;
  servicePrice: number;
  merchantName: string;
}

const PaymentPage: React.FC = () => {
  const { merchantId, serviceId } = useParams<{ merchantId: string, serviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingDetails = location.state as BookingDetails;

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [upiId, setUpiId] = useState('');
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
    
    // Validate that we have booking details
    if (!bookingDetails) {
      toast.error('Booking information missing');
      navigate(-1);
    }
  }, [navigate, bookingDetails]);

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format to MM/YY
    const input = e.target.value.replace(/\D/g, '');
    if (input.length <= 4) {
      const formatted = input.length > 2 
        ? `${input.slice(0, 2)}/${input.slice(2)}` 
        : input;
      setCardExpiry(formatted);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format to XXXX XXXX XXXX XXXX
    const input = e.target.value.replace(/\D/g, '');
    if (input.length <= 16) {
      const formatted = input.match(/.{1,4}/g)?.join(' ') || input;
      setCardNumber(formatted);
    }
  };

  const handlePayment = async () => {
    if (!user || !merchantId || !serviceId || !bookingDetails) {
      toast.error('Missing required information');
      return;
    }

    // Validate payment details based on payment method
    if (paymentMethod === 'card') {
      if (!cardName || !cardNumber || !cardExpiry || !cardCVC) {
        toast.error('Please fill in all card details');
        return;
      }
    } else if (paymentMethod === 'upi' && !upiId) {
      toast.error('Please enter your UPI ID');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Create booking in database
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          merchant_id: merchantId,
          service_id: serviceId,
          date: bookingDetails.bookingDate,
          time_slot: bookingDetails.bookingTime,
          status: 'confirmed',
          payment_status: 'completed',
        })
        .select()
        .single();
      
      if (bookingError) throw bookingError;
      
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingData.id,
          method: paymentMethod,
          amount: bookingDetails.servicePrice,
          status: 'completed',
        });
      
      if (paymentError) throw paymentError;
      
      // Show success and navigate to receipt
      toast.success('Payment successful!');
      navigate(`/receipt/${bookingData.id}`, {
        state: {
          ...bookingDetails,
          bookingId: bookingData.id,
          paymentMethod
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      setProcessingPayment(false);
    }
  };

  if (!bookingDetails) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
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
                <span className="text-gray-600">Service</span>
                <span className="font-medium">{bookingDetails.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Merchant</span>
                <span className="font-medium">{bookingDetails.merchantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium">{bookingDetails.bookingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time</span>
                <span className="font-medium">{bookingDetails.bookingTime}</span>
              </div>
              {bookingDetails.staffId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Staff</span>
                  <span className="font-medium">Selected</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-lg font-medium">
                <span>Total</span>
                <span>₹{bookingDetails.servicePrice}</span>
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
            <Label
              htmlFor="card-option"
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'card' ? 'border-booqit-primary bg-booqit-primary/5' : 'border-gray-200'
              }`}
            >
              <RadioGroupItem value="card" id="card-option" className="mr-3" />
              <CreditCard className="h-5 w-5 mr-3 text-gray-600" />
              <span>Credit/Debit Card</span>
            </Label>
            
            <Label
              htmlFor="upi-option"
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'upi' ? 'border-booqit-primary bg-booqit-primary/5' : 'border-gray-200'
              }`}
            >
              <RadioGroupItem value="upi" id="upi-option" className="mr-3" />
              <User className="h-5 w-5 mr-3 text-gray-600" />
              <span>UPI</span>
            </Label>
            
            <Label
              htmlFor="wallet-option"
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'wallet' ? 'border-booqit-primary bg-booqit-primary/5' : 'border-gray-200'
              }`}
            >
              <RadioGroupItem value="wallet" id="wallet-option" className="mr-3" />
              <Wallet className="h-5 w-5 mr-3 text-gray-600" />
              <span>Digital Wallet</span>
            </Label>
            
            <Label
              htmlFor="cash-option"
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'cash' ? 'border-booqit-primary bg-booqit-primary/5' : 'border-gray-200'
              }`}
            >
              <RadioGroupItem value="cash" id="cash-option" className="mr-3" />
              <span className="mr-3 text-gray-600 font-medium">₹</span>
              <span>Cash on Service</span>
            </Label>
          </RadioGroup>
        </div>
        
        {/* Payment Details based on selected method */}
        <div>
          {paymentMethod === 'card' && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <Label htmlFor="card-name">Name on Card</Label>
                  <Input 
                    id="card-name" 
                    placeholder="John Doe" 
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input 
                    id="card-number" 
                    placeholder="1234 5678 9012 3456" 
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="card-expiry">Expiry Date</Label>
                    <Input 
                      id="card-expiry" 
                      placeholder="MM/YY" 
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="card-cvc">CVC</Label>
                    <Input 
                      id="card-cvc" 
                      placeholder="123" 
                      value={cardCVC}
                      onChange={(e) => {
                        const input = e.target.value.replace(/\D/g, '');
                        if (input.length <= 4) {
                          setCardCVC(input);
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {paymentMethod === 'upi' && (
            <Card>
              <CardContent className="p-4">
                <Label htmlFor="upi-id">UPI ID</Label>
                <Input 
                  id="upi-id" 
                  placeholder="yourname@bank" 
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </CardContent>
            </Card>
          )}
          
          {paymentMethod === 'wallet' && (
            <Card>
              <CardContent className="p-4 text-center text-gray-600">
                <p>You'll be redirected to complete the payment</p>
              </CardContent>
            </Card>
          )}
          
          {paymentMethod === 'cash' && (
            <Card>
              <CardContent className="p-4 text-center text-gray-600">
                <p>Pay the amount directly at the service location</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
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
            `Pay ₹${bookingDetails.servicePrice}`
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
