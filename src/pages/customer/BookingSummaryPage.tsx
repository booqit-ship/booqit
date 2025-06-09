
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Clock, MapPin, User, Package } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';

interface ServiceSelection {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface BookingData {
  merchantId: string;
  merchantName: string;
  merchantAddress: string;
  staffId: string;
  staffName: string;
  services: ServiceSelection[];
  date: string;
  timeSlot: string;
}

const BookingSummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  useEffect(() => {
    const data = location.state?.bookingData;
    if (!data || !data.services || data.services.length === 0) {
      console.error('Invalid booking data:', data);
      navigate('/');
      return;
    }
    setBookingData(data);
  }, [location.state, navigate]);

  const handleProceedToPayment = () => {
    if (bookingData) {
      navigate('/payment', { state: { bookingData } });
    }
  };

  if (!bookingData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  const totalPrice = bookingData.services.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = bookingData.services.reduce((sum, service) => sum + service.duration, 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-light mb-2">Booking Summary</h1>
        <p className="text-gray-600">Review your appointment details</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {bookingData.merchantName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{bookingData.merchantAddress}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-4 w-4" />
            <span className="text-sm">Stylist: {bookingData.staffName}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{new Date(bookingData.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">{formatTimeToAmPm(bookingData.timeSlot)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Duration:</span>
              <span className="font-medium">{totalDuration} minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selected Services ({bookingData.services.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bookingData.services.map((service, index) => (
              <div key={service.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-gray-600">{service.duration} minutes</p>
                </div>
                <p className="font-semibold">₹{service.price}</p>
              </div>
            ))}
            
            <Separator className="my-4" />
            
            <div className="flex justify-between items-center font-semibold text-lg">
              <span>Total</span>
              <span className="text-booqit-primary">₹{totalPrice}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button
          onClick={handleProceedToPayment}
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
          size="lg"
        >
          Proceed to Payment
        </Button>
        
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default BookingSummaryPage;
