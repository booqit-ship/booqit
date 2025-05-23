
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

type PaymentMethod = 'cash' | 'upi';

interface SelectedService {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface SelectedStaff {
  serviceId: string;
  staffId: string | 'random';
  staffName: string;
}

interface BookingDetails {
  services: SelectedService[];
  staffMembers: SelectedStaff[];
  bookingDate: string;
  bookingTime: string;
  totalPrice: number;
  totalDuration: number;
  merchantName: string;
}

const PaymentPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingDetails = location.state as BookingDetails;

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  const handlePayment = async () => {
    if (!user || !merchantId || !bookingDetails) {
      toast.error('Missing required information');
      return;
    }

    // Validate UPI if UPI payment method is selected
    if (paymentMethod === 'upi' && !upiId) {
      toast.error('Please enter your UPI ID');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Create bookings for each service
      const bookingPromises = bookingDetails.services.map(async (service) => {
        // Find staff for this service
        const staffSelection = bookingDetails.staffMembers.find(s => s.serviceId === service.id);
        let staffId = null;
        
        // If random is selected, choose random staff or null if none available
        if (staffSelection?.staffId === 'random') {
          // Get staff eligible for this service
          const { data: eligibleStaff } = await supabase
            .from('staff')
            .select('id')
            .eq('merchant_id', merchantId)
            .contains('assigned_service_ids', [service.id]);
            
          // Pick a random staff if available
          if (eligibleStaff && eligibleStaff.length > 0) {
            const randomIndex = Math.floor(Math.random() * eligibleStaff.length);
            staffId = eligibleStaff[randomIndex].id;
          }
        } else if (staffSelection) {
          staffId = staffSelection.staffId;
        }
        
        // Create booking in database
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            user_id: user.id,
            merchant_id: merchantId,
            service_id: service.id,
            date: bookingDetails.bookingDate,
            time_slot: bookingDetails.bookingTime,
            status: 'confirmed',
            payment_status: 'pending', // Will be updated to 'completed' after payment
            staff_id: staffId !== 'random' ? staffId : null
          })
          .select()
          .single();
        
        if (bookingError) throw bookingError;
        
        return bookingData;
      });
      
      // Wait for all bookings to be created
      const createdBookings = await Promise.all(bookingPromises);
      
      // Create single payment record for all bookings
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: createdBookings[0].id, // Reference first booking
          method: paymentMethod,
          amount: bookingDetails.totalPrice,
          status: paymentMethod === 'cash' ? 'pending' : 'completed',
          booking_ids: createdBookings.map(b => b.id) // Store all booking IDs
        });
      
      if (paymentError) throw paymentError;
      
      // Update all bookings payment status
      if (paymentMethod === 'cash') {
        for (const booking of createdBookings) {
          await supabase
            .from('bookings')
            .update({ payment_status: 'pending' })
            .eq('id', booking.id);
        }
      } else {
        for (const booking of createdBookings) {
          await supabase
            .from('bookings')
            .update({ payment_status: 'completed' })
            .eq('id', booking.id);
        }
      }
      
      // Show success and navigate to receipt
      toast.success('Booking confirmed!');
      navigate(`/receipt/${createdBookings[0].id}`, {
        state: {
          bookingIds: createdBookings.map(b => b.id),
          paymentMethod,
          bookingDetails
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
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
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">{formatDuration(bookingDetails.totalDuration)}</span>
              </div>
              
              <Separator className="my-1" />
              <p className="font-medium">Services</p>
              
              {bookingDetails.services.map((service, index) => {
                const staffMember = bookingDetails.staffMembers.find(s => s.serviceId === service.id);
                
                return (
                  <div key={service.id} className="pl-2 flex justify-between text-sm">
                    <div>
                      <span>{service.name}</span>
                      {staffMember && (
                        <span className="block text-xs text-gray-500">
                          Stylist: {staffMember.staffName}
                        </span>
                      )}
                    </div>
                    <span>₹{service.price}</span>
                  </div>
                );
              })}
              
              <Separator className="my-1" />
              <div className="flex justify-between text-lg font-medium">
                <span>Total</span>
                <span>₹{bookingDetails.totalPrice}</span>
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
              htmlFor="cash-option"
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'cash' ? 'border-booqit-primary bg-booqit-primary/5' : 'border-gray-200'
              }`}
            >
              <RadioGroupItem value="cash" id="cash-option" className="mr-3" />
              <span className="mr-3 text-gray-600 font-medium">₹</span>
              <span>Pay at Shop</span>
            </Label>
            
            <Label
              htmlFor="upi-option"
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'upi' ? 'border-booqit-primary bg-booqit-primary/5' : 'border-gray-200'
              }`}
            >
              <RadioGroupItem value="upi" id="upi-option" className="mr-3" disabled />
              <User className="h-5 w-5 mr-3 text-gray-600" />
              <div>
                <span className="block">UPI</span>
                <span className="block text-xs text-gray-500">Coming Soon</span>
              </div>
            </Label>
          </RadioGroup>
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
            paymentMethod === 'cash' ? 'Confirm Booking' : `Pay ₹${bookingDetails.totalPrice}`
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentPage;
