
import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, MapPin, User, Navigation } from 'lucide-react';
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

  const handleViewOnMap = () => {
    if (merchant?.address) {
      const encodedAddress = encodeURIComponent(merchant.address);
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      window.open(mapUrl, '_blank');
    }
  };

  if (!bookingId || !merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Booking Not Found</h1>
          <p className="text-gray-600 font-poppins">Unable to load booking details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="h-14 w-14 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3 font-righteous">Booking Confirmed!</h1>
          <p className="text-gray-600 font-poppins text-lg">Your appointment has been successfully booked</p>
        </div>

        {/* Booking Details Card */}
        <Card className="shadow-xl border-0 bg-white mb-6">
          <CardContent className="p-6">
            <div className="space-y-5">
              {/* Booking ID */}
              <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <p className="text-sm text-gray-600 font-poppins mb-1">Booking ID</p>
                <p className="font-mono text-lg font-semibold text-gray-800">{bookingId}</p>
              </div>

              {/* Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
                <User className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-semibold font-poppins text-blue-800">{guestInfo.name}</p>
                  <p className="text-sm text-blue-600 font-poppins">{guestInfo.phone}</p>
                </div>
              </div>

              {/* Shop Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
                <MapPin className="h-6 w-6 text-purple-600" />
                <div className="flex-1">
                  <p className="font-semibold font-poppins text-purple-800">{merchant.shop_name}</p>
                  <p className="text-sm text-purple-600 font-poppins">{merchant.address}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
                <Calendar className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold font-poppins text-green-800">
                    {formatDateInIST(new Date(bookingDate), 'EEE, MMM d, yyyy')}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Clock className="h-4 w-4" />
                    <span className="font-poppins">{formatTimeToAmPm(bookingTime)}</span>
                    {selectedStaffDetails && (
                      <span className="font-poppins">• with {selectedStaffDetails.name}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-3">
                <h4 className="font-semibold font-righteous text-gray-800 text-lg">Services Booked:</h4>
                {selectedServices?.map((service, index) => (
                  <div key={service.id} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-lg">
                    <span className="font-poppins">{service.name} ({service.duration}min)</span>
                    <span className="font-semibold text-purple-600">₹{service.price}</span>
                  </div>
                ))}
                <div className="border-t-2 border-purple-200 pt-3 flex justify-between items-center font-semibold bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg">
                  <span className="font-poppins text-purple-800">Total Amount:</span>
                  <span className="text-xl text-purple-600">₹{totalPrice}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Notice */}
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100 mb-6 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center mt-1">
                <span className="text-yellow-700 text-lg font-bold">₹</span>
              </div>
              <div>
                <h4 className="font-medium text-yellow-800 font-righteous text-lg">Payment at Shop</h4>
                <p className="text-sm text-yellow-700 font-poppins mt-1">
                  Please pay ₹{totalPrice} at the shop after your service is completed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 mb-6 shadow-lg">
          <CardContent className="p-5">
            <h4 className="font-medium text-blue-800 mb-3 font-righteous text-lg">Important Notes:</h4>
            <ul className="text-sm text-blue-700 space-y-2 font-poppins">
              <li>• Please arrive 5-10 minutes before your appointment</li>
              <li>• Your slot is confirmed and reserved</li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <Button 
            onClick={handleViewOnMap}
            variant="outline" 
            className="w-full h-12 border-purple-300 text-purple-600 hover:bg-purple-50 font-poppins font-medium"
          >
            <Navigation className="h-5 w-5 mr-2" />
            View Shop on Map
          </Button>
          
          <Button 
            onClick={handleNewBooking}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 font-poppins font-medium shadow-lg"
          >
            Book Another Appointment
          </Button>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 font-poppins">
            Thank you for choosing our service! We look forward to seeing you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuestBookingSuccessPage;
