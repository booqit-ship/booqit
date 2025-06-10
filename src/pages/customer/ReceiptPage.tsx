import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Store, Clock, User, CheckCircle2, CreditCard, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatTimeToAmPm, timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import { format } from 'date-fns';
import CancelBookingButton from '@/components/customer/CancelBookingButton';

const ReceiptPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string; }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Get data from navigation state if available
  const stateData = location.state;

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) return;
      try {
        const { data: bookingData, error } = await supabase
          .from('bookings')
          .select(`
            *,
            merchants (shop_name, address),
            services (name, price),
            staff (name)
          `)
          .eq('id', bookingId)
          .single();

        if (error) {
          console.error('Error fetching booking:', error);
          return;
        }
        setBooking(bookingData);
      } catch (error) {
        console.error('Error fetching booking details:', error);
      } finally {
        setLoading(false);
      }
    };

    // Use state data if available, otherwise fetch from database
    if (stateData && stateData.booking) {
      setBooking(stateData.booking);
      setLoading(false);
    } else {
      fetchBookingDetails();
    }
  }, [bookingId, stateData]);

  const handleCancelSuccess = () => {
    // Update booking status locally
    setBooking((prev: any) => ({
      ...prev,
      status: 'cancelled'
    }));
  };

  const handleOpenMapDirections = () => {
    if (merchant?.address) {
      const encodedAddress = encodeURIComponent(merchant.address);
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  // Parse services and calculate total duration and time range
  const getServicesAndDuration = () => {
    let services = [];
    let totalDuration = 0;
    
    // Try to get services from state data first
    if (stateData?.selectedServices) {
      services = stateData.selectedServices;
      totalDuration = services.reduce((sum: number, service: any) => sum + (service.duration || 0), 0);
    } 
    // Otherwise try to parse from booking data
    else if (booking) {
      // Check if booking has services JSON field
      if (booking.services && typeof booking.services === 'object') {
        services = Array.isArray(booking.services) ? booking.services : [booking.services];
      } else if (booking.services && typeof booking.services === 'string') {
        try {
          const parsedServices = JSON.parse(booking.services);
          services = Array.isArray(parsedServices) ? parsedServices : [parsedServices];
        } catch (error) {
          console.error('Error parsing services JSON:', error);
          services = [];
        }
      }
      
      // If no services found in JSON, fall back to single service
      if (services.length === 0 && booking.services) {
        services = [booking.services];
      }
      
      // Use total_duration if available, otherwise calculate from services
      if (booking.total_duration) {
        totalDuration = booking.total_duration;
      } else {
        totalDuration = services.reduce((sum: number, service: any) => sum + (service.duration || 0), 0);
      }
    }
    
    return { services, totalDuration };
  };

  // Calculate time range based on start time and total duration
  const getTimeRange = () => {
    if (!booking?.time_slot) return '';
    
    const { totalDuration } = getServicesAndDuration();
    if (!totalDuration) return formatTimeToAmPm(booking.time_slot);
    
    const startTimeMinutes = timeToMinutes(booking.time_slot);
    const endTimeMinutes = startTimeMinutes + totalDuration;
    const endTime = minutesToTime(endTimeMinutes);
    
    return `${formatTimeToAmPm(booking.time_slot)} - ${formatTimeToAmPm(endTime)}`;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Booking not found</p>
        <Button onClick={() => navigate('/calendar')}>Go to My Bookings</Button>
      </div>
    );
  }

  const merchant = stateData?.merchant || booking.merchants;
  const { services, totalDuration } = getServicesAndDuration();
  const selectedStaffDetails = stateData?.selectedStaffDetails || {
    name: booking.staff?.name || booking.stylist_name
  };
  const payment = stateData?.payment;

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-0 text-white hover:bg-white/20" 
            onClick={() => navigate('/calendar')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">Booking Receipt</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Booking Status */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6 text-center">
            {booking.status === 'cancelled' ? (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-red-600 mb-2">Booking Cancelled</h2>
                <p className="text-gray-600">Your booking has been cancelled successfully</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-green-600 mb-2 font-medium text-xl">Booking Confirmed!</h2>
                <p className="text-gray-600">Your appointment has been successfully booked</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center font-medium text-lg">
              <Store className="h-5 w-5 mr-2 text-booqit-primary" />
              Booking Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-medium text-sm">{booking.id.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Shop:</span>
                <span className="font-medium">{merchant?.shop_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{format(new Date(booking.date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {getTimeRange()}
                </span>
              </div>
              {totalDuration > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{totalDuration} minutes</span>
                </div>
              )}
              {selectedStaffDetails && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Stylist:</span>
                  <span className="font-medium flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {selectedStaffDetails.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Services:</span>
                <div className="text-right">
                  {services.length > 0 ? (
                    services.map((service: any, index: number) => (
                      <div key={service.id || index} className="font-medium">
                        {service.name}
                        {service.duration && (
                          <span className="text-sm text-gray-500 ml-1">({service.duration}min)</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="font-medium">No services found</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium capitalize ${
                  booking.status === 'confirmed' ? 'text-green-600' : 
                  booking.status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {booking.status}
                </span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total Amount:</span>
                  <span className="text-booqit-primary">
                    ₹{services.reduce((sum: number, service: any) => sum + (service.price || 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg flex items-center font-medium">
              <CreditCard className="h-5 w-5 mr-2 text-booqit-primary" />
              Payment Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">Pay at Shop</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`font-medium capitalize ${
                  booking.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {booking.payment_status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {booking.status !== 'cancelled' && (
            <CancelBookingButton 
              bookingId={booking.id} 
              onCancelled={handleCancelSuccess} 
              className="w-full" 
            />
          )}
          
          <Button variant="outline" className="w-full" onClick={() => navigate('/calendar')}>
            View All Bookings
          </Button>
        </div>

        {/* Shop Location Map */}
        {merchant?.address && (
          <Card 
            className="shadow-lg border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" 
            onClick={handleOpenMapDirections}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Shop Location
                  </h4>
                  <p className="text-sm text-blue-700">{merchant.address}</p>
                </div>
                <div className="text-blue-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">Tap to open directions in Google Maps</p>
            </CardContent>
          </Card>
        )}

        {/* Important Note */}
        {booking.status === 'confirmed' && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-orange-800 mb-2">📋 Important Note</h4>
              <p className="text-sm text-orange-700">
                Please arrive on time and pay the amount at the shop. You can cancel up to 30 mins before your appointment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReceiptPage;
