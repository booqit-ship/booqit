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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash'); // Default to cash
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

  const handlePayment = async () => {
    if (!user || !merchantId || !serviceId || !bookingDetails) {
      toast.error('Missing required information');
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
          staff_id: bookingDetails.staffId, // Include the selected staff
          date: bookingDetails.bookingDate,
          time_slot: bookingDetails.bookingTime,
          status: 'confirmed',
          payment_status: 'pending', // Since it's cash on service
        })
        .select()
        .single();
      
      if (bookingError) throw bookingError;
      
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingData.id,
          method: 'cash',
          amount: bookingDetails.servicePrice,
          status: 'pending', // Since it's cash on service
        });
      
      if (paymentError) throw paymentError;
      
      // Show success and navigate to receipt
      toast.success('Booking confirmed!');
      navigate(`/receipt/${bookingData.id}`, {
        state: {
          ...bookingDetails,
          bookingId: bookingData.id,
          paymentMethod: 'cash'
        }
      });
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Booking failed. Please try again.');
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
            `Confirm Booking - ₹${bookingDetails.servicePrice}`
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
