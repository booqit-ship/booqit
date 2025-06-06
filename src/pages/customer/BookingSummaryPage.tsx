
import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, CalendarIcon, Clock, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const BookingSummaryPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Safely destructure location.state with fallbacks
  const {
    merchant = null,
    selectedServices = null,
    totalPrice = 0,
    totalDuration = 0,
    selectedStaff = null,
    selectedDate = null,
    selectedTime = null
  } = location.state || {};

  const handleProceedToPayment = () => {
    navigate(`/payment/${merchantId}`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff,
        selectedDate,
        selectedTime
      }
    });
  };

  // Auto-navigate to payment after 3 seconds
  useEffect(() => {
    if (merchant && selectedServices) {
      const timer = setTimeout(() => {
        handleProceedToPayment();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [merchant, selectedServices]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Show error state if required data is missing
  if (!merchant || !selectedServices) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Booking information missing</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
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
          <h1 className="text-xl font-medium">Booking Summary</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Auto-redirect notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-blue-800 text-sm text-center">
              Redirecting to payment in 3 seconds...
            </p>
          </CardContent>
        </Card>

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
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Selected Services</h3>
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
              <span>Total</span>
              <span>₹{totalPrice}</span>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        {selectedDate && selectedTime && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Date & Time</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-3 text-gray-500" />
                  <span>{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-3 text-gray-500" />
                  <span>{selectedTime} ({totalDuration} minutes)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stylist */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Stylist</h3>
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarFallback className="bg-gray-200 text-gray-700">
                  {selectedStaff ? 'S' : 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {selectedStaff ? 'Selected Stylist' : 'Any Available Stylist'}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedStaff ? 'Your preferred choice' : 'We\'ll assign the best available stylist'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Info */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 text-amber-800">Payment Method</h3>
            <p className="text-sm text-amber-700">
              You will pay ₹{totalPrice} in cash when you arrive for your appointment.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handleProceedToPayment}
        >
          Confirm Booking - ₹{totalPrice}
        </Button>
      </div>
    </div>
  );
};

export default BookingSummaryPage;
