
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, X, Calendar, Clock, MapPin, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import CancellationConfirmDialog from '@/components/guest/CancellationConfirmDialog';

interface BookingData {
  booking_id: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shop_name: string;
  shop_address: string;
  service_name: string;
  service_duration: number;
  service_price: number;
  stylist_name?: string;
  booking_status: string;
  total_duration: number;
}

const GuestBookingCancellationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error('Please enter a booking ID or phone number');
      return;
    }

    setIsSearching(true);
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchValue.trim());
      
      const { data, error } = await supabase.rpc('get_guest_bookings_for_cancellation', {
        p_booking_id: isUUID ? searchValue.trim() : null,
        p_phone_number: !isUUID ? searchValue.trim() : null
      });

      if (error) {
        console.error('Search error:', error);
        toast.error('Failed to search bookings');
        return;
      }

      if (!data || data.length === 0) {
        toast.info('No confirmed bookings found for the provided information');
        setBookings([]);
        return;
      }

      setBookings(data);
      toast.success(`Found ${data.length} booking(s) that can be cancelled`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search bookings');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.rpc('cancel_guest_booking_safe', {
        p_booking_id: bookingId
      });

      if (error) {
        console.error('Cancellation error:', error);
        toast.error('Failed to cancel booking');
        return;
      }

      if (!data.success) {
        toast.error(data.error || 'Failed to cancel booking');
        return;
      }

      toast.success('Booking cancelled successfully');
      setBookings(prev => prev.filter(booking => booking.booking_id !== bookingId));
      setShowConfirmDialog(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Cancellation error:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const openCancelDialog = (booking: BookingData) => {
    setSelectedBooking(booking);
    setShowConfirmDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="relative flex items-center justify-center">
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute left-0 text-white hover:bg-white/20 rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-medium font-righteous">Cancel Booking</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Search Section */}
        <Card className="mb-6 border-red-200 bg-white shadow-lg">
          <CardContent className="p-5">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 font-righteous text-gray-800">Find Your Booking</h3>
                <p className="text-gray-600 text-sm font-poppins">
                  Enter your booking ID or phone number to find bookings that can be cancelled
                </p>
              </div>

              <div>
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 font-poppins">
                  Booking ID or Phone Number
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="search"
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-10 h-12 font-poppins"
                    placeholder="Enter booking ID or phone number"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                  />
                </div>
              </div>

              <Button 
                onClick={handleSearch}
                disabled={isSearching || !searchValue.trim()}
                className="w-full bg-red-600 hover:bg-red-700 text-white h-12 font-poppins font-medium"
              >
                {isSearching ? 'Searching...' : 'Search Bookings'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {bookings.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold font-righteous text-gray-800">
              Confirmed Bookings ({bookings.length})
            </h3>

            {bookings.map((booking) => (
              <Card key={booking.booking_id} className="border-gray-200 bg-white shadow-lg">
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {/* Booking ID */}
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 font-poppins mb-1">Booking ID</p>
                      <p className="font-mono text-sm font-semibold text-gray-800">
                        {booking.booking_id}
                      </p>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-semibold font-poppins text-blue-800">{booking.customer_name}</p>
                        <p className="text-sm text-blue-600 font-poppins">{booking.customer_phone}</p>
                      </div>
                    </div>

                    {/* Shop Info */}
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-purple-600 mt-1" />
                      <div>
                        <p className="font-semibold font-poppins text-purple-800">{booking.shop_name}</p>
                        <p className="text-sm text-purple-600 font-poppins">{booking.shop_address}</p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-semibold font-poppins text-green-800">
                          {formatDateInIST(new Date(booking.booking_date), 'EEE, MMM d, yyyy')}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Clock className="h-4 w-4" />
                          <span className="font-poppins">{formatTimeToAmPm(booking.booking_time)}</span>
                          {booking.stylist_name && (
                            <span className="font-poppins">• with {booking.stylist_name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Service Info */}
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-poppins text-yellow-800">
                          {booking.service_name} ({booking.service_duration}min)
                        </span>
                        <span className="font-semibold text-yellow-600">₹{booking.service_price}</span>
                      </div>
                    </div>

                    {/* Cancel Button */}
                    <Button 
                      onClick={() => openCancelDialog(booking)}
                      variant="destructive"
                      className="w-full h-12 bg-red-600 hover:bg-red-700 font-poppins font-medium"
                    >
                      <Trash2 className="h-5 w-5 mr-2" />
                      Cancel This Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {bookings.length === 0 && searchValue && !isSearching && (
          <Card className="border-gray-200 bg-white shadow-lg">
            <CardContent className="p-8 text-center">
              <X className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold font-righteous text-gray-800 mb-2">No Bookings Found</h3>
              <p className="text-gray-600 font-poppins text-sm">
                We couldn't find any confirmed bookings for the provided information. 
                Please check your booking ID or phone number and try again.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancellation Confirmation Dialog */}
      {showConfirmDialog && selectedBooking && (
        <CancellationConfirmDialog
          booking={selectedBooking}
          isOpen={showConfirmDialog}
          onClose={() => {
            setShowConfirmDialog(false);
            setSelectedBooking(null);
          }}
          onConfirm={() => handleCancelBooking(selectedBooking.booking_id)}
          isLoading={isCancelling}
        />
      )}
    </div>
  );
};

export default GuestBookingCancellationPage;
