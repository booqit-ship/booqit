
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Booking, Merchant, Service, Staff } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Share2, Calendar, Home, CheckCircle2 } from 'lucide-react';
import { format, addMinutes } from 'date-fns';

interface ReceiptProps {}

interface BookingSummary extends Booking {
  service: Service;
  merchant: Merchant;
  staff?: Staff;
}

const ReceiptPage: React.FC<ReceiptProps> = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  useEffect(() => {
    const fetchBookingDetails = async () => {
      setLoading(true);
      
      try {
        // Get the booking IDs from location state if available, otherwise use the URL param
        const bookingIds = location.state?.bookingIds || [id];
        
        // Fetch all bookings
        const fetchPromises = bookingIds.map(async (bookingId: string) => {
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
              *,
              service:service_id(*),
              merchant:merchant_id(*),
              staff:staff_id(*)
            `)
            .eq('id', bookingId)
            .single();
          
          if (bookingError) throw bookingError;
          return booking;
        });
        
        const results = await Promise.all(fetchPromises);
        
        // Calculate totals
        let total = 0;
        let duration = 0;
        
        results.forEach(booking => {
          if (booking.service) {
            total += booking.service.price;
            duration += booking.service.duration;
          }
        });
        
        setTotalAmount(total);
        setTotalDuration(duration);
        setBookings(results);
      } catch (error) {
        console.error('Error fetching booking details:', error);
        toast.error('Could not load booking details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookingDetails();
  }, [id, location.state]);
  
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
  
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    // Parse time in 24-hour format
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    
    // Add duration
    const endDate = addMinutes(startDate, durationMinutes);
    
    // Format to HH:MM
    return format(endDate, 'HH:mm');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Booking not found</p>
        <Button onClick={() => navigate('/customer/bookings')}>View My Bookings</Button>
      </div>
    );
  }

  // Use the first booking to get merchant information
  const firstBooking = bookings[0];
  const merchantName = firstBooking.merchant?.shop_name || 'Service Provider';
  const paymentMethod = location.state?.paymentMethod || 'Unknown';
  const paymentStatus = firstBooking.payment_status || 'pending';

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-green-500 text-white p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-white rounded-full p-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
        <p className="mt-1">Thank you for your booking</p>
      </div>
      
      <div className="flex-grow bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 space-y-4">
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">{merchantName}</h2>
              <Button variant="ghost" size="sm" className="text-gray-500">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium">{firstBooking.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time</span>
                <span className="font-medium">
                  {firstBooking.time_slot} - {calculateEndTime(firstBooking.time_slot, totalDuration)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">{formatDuration(totalDuration)}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h3 className="font-medium">Services</h3>
              
              {bookings.map((booking) => (
                <div key={booking.id} className="flex justify-between">
                  <div>
                    <p>{booking.service?.name}</p>
                    {booking.staff && (
                      <p className="text-sm text-gray-500">Stylist: {booking.staff.name}</p>
                    )}
                  </div>
                  <p className="font-medium">₹{booking.service?.price}</p>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>₹{totalAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Method</span>
                <span>{paymentMethod === 'cash' ? 'Pay at Shop' : paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Status</span>
                <span className={`${
                  paymentStatus === 'completed' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md text-blue-800 text-sm">
              Your booking confirmation has been sent to your registered email address.
            </div>
          </div>
          
          <div className="flex border-t">
            <Button 
              variant="ghost" 
              className="flex-1 py-6 rounded-none border-r"
              onClick={() => navigate('/customer')}
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button 
              variant="ghost" 
              className="flex-1 py-6 rounded-none"
              onClick={() => navigate('/customer/calendar')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              My Bookings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage;
