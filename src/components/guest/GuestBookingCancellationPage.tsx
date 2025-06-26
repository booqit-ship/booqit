
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, ArrowLeft, Calendar, MapPin, User, Clock, X, Loader2 } from 'lucide-react';
import { CancellationConfirmDialog } from '@/components/guest/CancellationConfirmDialog';

interface GuestBooking {
  booking_id: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  shop_name: string;
  shop_address: string;
  service_name: string;
  service_duration: number;
  service_price: number;
  stylist_name: string | null;
  booking_status: string;
  total_duration: number | null;
}

const GuestBookingCancellationPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<GuestBooking | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a booking ID or phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const isBookingId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQuery);
      
      const { data, error } = await supabase.rpc('get_guest_bookings_for_cancellation', {
        p_booking_id: isBookingId ? searchQuery : null,
        p_phone_number: !isBookingId ? searchQuery : null
      });

      if (error) {
        console.error('Error searching bookings:', error);
        toast({
          title: "Search Error",
          description: "Failed to search for bookings",
          variant: "destructive",
        });
        return;
      }

      setBookings(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "No Bookings Found",
          description: "No confirmed bookings found for the provided information",
        });
      }
    } catch (error) {
      console.error('Error searching bookings:', error);
      toast({
        title: "Search Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCancelBooking = (booking: GuestBooking) => {
    setSelectedBooking(booking);
    setShowConfirmDialog(true);
  };

  const confirmCancellation = async () => {
    if (!selectedBooking) return;

    setIsCancelling(true);
    try {
      const { data, error } = await supabase.rpc('cancel_guest_booking_safe', {
        p_booking_id: selectedBooking.booking_id
      });

      if (error) {
        console.error('Cancellation error:', error);
        toast({
          title: "Cancellation Failed",
          description: "Failed to cancel booking. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Handle both direct JSON response and wrapped response
      const result = typeof data === 'object' && data !== null ? data : JSON.parse(data || '{}');

      if (!result.success) {
        toast({
          title: "Cancellation Failed",
          description: result.error || "Failed to cancel booking",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled",
      });

      // Remove the cancelled booking from the list
      setBookings(prev => prev.filter(b => b.booking_id !== selectedBooking.booking_id));
      setShowConfirmDialog(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Cancellation Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-righteous mb-2">Cancel Booking</h1>
            <p className="text-purple-100 font-poppins text-sm sm:text-base">Search and cancel your confirmed bookings</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {/* Search Section */}
        <Card className="shadow-xl border-0 bg-white mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="font-righteous text-lg sm:text-xl text-gray-800">Find Your Booking</CardTitle>
            <p className="text-gray-600 font-poppins text-sm">
              Enter your booking ID or phone number to find bookings that can be cancelled
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 font-poppins">
                  Booking ID or Phone Number
                </Label>
                <Input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter booking ID or phone number"
                  className="h-10 sm:h-12 font-poppins border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="h-10 sm:h-12 sm:mt-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Results */}
        {bookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-righteous text-gray-800 mb-4">
              Found {bookings.length} booking{bookings.length > 1 ? 's' : ''} available for cancellation
            </h2>
            
            {bookings.map((booking) => (
              <Card key={booking.booking_id} className="shadow-lg border-0 bg-white">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="font-righteous text-lg text-gray-800 mb-2">
                        {booking.shop_name}
                      </h3>
                      <div className="flex items-start text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-poppins">{booking.shop_address}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCancelBooking(booking)}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <X className="w-4 h-4 mr-2" />
                      )}
                      Cancel
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-800 text-sm sm:text-base">{formatDate(booking.booking_date)}</p>
                        <p className="text-sm text-gray-600">{formatTime(booking.booking_time)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <User className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-800 text-sm sm:text-base">{booking.customer_name}</p>
                        <p className="text-sm text-gray-600">{booking.customer_phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div>
                        <p className="font-medium text-purple-800">{booking.service_name}</p>
                        <div className="flex items-center text-purple-600 text-sm">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{booking.service_duration} minutes</span>
                          {booking.stylist_name && (
                            <span className="ml-3">with {booking.stylist_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right sm:text-left">
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">₹{booking.service_price}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-poppins break-all">
                      Booking ID: {booking.booking_id}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No bookings message when searched but nothing found */}
        {searchQuery && !isSearching && bookings.length === 0 && (
          <Card className="shadow-lg border-0 bg-white text-center py-8 sm:py-12">
            <CardContent>
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-righteous text-gray-800 mb-2">No Bookings Found</h3>
              <p className="text-gray-600 font-poppins text-sm sm:text-base">
                No confirmed bookings were found for the provided information.
                <br />
                Please check your booking ID or phone number and try again.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <CancellationConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmCancellation}
        booking={selectedBooking}
      />
    </div>
  );
};

export default GuestBookingCancellationPage;
