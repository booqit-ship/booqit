
import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, MapPin, User, Phone } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';

const GuestBookingSuccessPage: React.FC = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    bookingId,
    merchant, 
    selectedServices, 
    totalPrice, 
    bookingDate, 
    bookingTime, 
    guestInfo,
    selectedStaffDetails
  } = location.state || {};

  const handleNewBooking = () => {
    navigate(`/book/${merchantId}`);
  };

  if (!bookingId || !merchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Booking Not Found</h1>
          <p className="text-gray-600">Unable to load booking details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-6">
      <div className="max-w-md mx-auto">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 font-righteous">Booking Confirmed!</h1>
          <p className="text-gray-600 font-poppins">Your appointment has been successfully booked</p>
        </div>

        {/* Booking Details Card */}
        <Card className="shadow-lg border-none mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Booking ID */}
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 font-poppins">Booking ID</p>
                <p className="font-mono text-sm font-semibold">{bookingId}</p>
              </div>

              {/* Guest Info */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold font-poppins">{guestInfo.name}</p>
                  <p className="text-sm text-gray-600 font-poppins">{guestInfo.phone}</p>
                </div>
              </div>

              {/* Shop Info */}
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-semibold font-poppins">{merchant.shop_name}</p>
                  <p className="text-sm text-gray-600 font-poppins">{merchant.address}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold font-poppins">
                    {formatDateInIST(new Date(bookingDate), 'EEE, MMM d, yyyy')}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-3 w-3" />
                    <span className="font-poppins">{formatTimeToAmPm(bookingTime)}</span>
                    {selectedStaffDetails && (
                      <span className="font-poppins">• with {selectedStaffDetails.name}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <h4 className="font-semibold font-righteous">Services Booked:</h4>
                {selectedServices?.map((service, index) => (
                  <div key={service.id} className="flex justify-between items-center text-sm">
                    <span className="font-poppins">{service.name} ({service.duration}min)</span>
                    <span className="font-semibold">₹{service.price}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between items-center font-semibold">
                  <span className="font-poppins">Total Amount:</span>
                  <span className="text-lg text-booqit-primary">₹{totalPrice}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Notice */}
        <Card className="border-yellow-200 bg-yellow-50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mt-1">
                <span className="text-yellow-600 text-xs font-bold">₹</span>
              </div>
              <div>
                <h4 className="font-medium text-yellow-800 font-righteous">Payment at Salon</h4>
                <p className="text-sm text-yellow-700 font-poppins">
                  Please pay ₹{totalPrice} at the salon after your service is completed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="border-blue-200 bg-blue-50 mb-6">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-800 mb-2 font-righteous">Important Notes:</h4>
            <ul className="text-sm text-blue-700 space-y-1 font-poppins">
              <li>• Please arrive 5-10 minutes before your appointment</li>
              <li>• Bring a valid ID for verification</li>
              <li>• Contact the salon if you need to reschedule</li>
              <li>• Your slot is confirmed and reserved</li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={() => window.location.href = `tel:${merchant.phone || ''}`}
            variant="outline" 
            className="w-full"
            disabled={!merchant.phone}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Salon
          </Button>
          
          <Button 
            onClick={handleNewBooking}
            className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
          >
            Book Another Appointment
          </Button>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 font-poppins">
            Thank you for choosing our service! We look forward to seeing you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestBookingSuccessPage;
