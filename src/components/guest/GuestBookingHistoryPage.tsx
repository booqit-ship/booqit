import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, ArrowLeft, Calendar, MapPin, User, Clock, FileText, Download, Eye, Loader2, CheckCircle, X, Receipt } from 'lucide-react';
import { ReceiptViewModal } from '@/components/guest/ReceiptViewModal';

interface GuestBookingHistory {
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
  created_at: string;
  merchant_id: string;
}

const GuestBookingHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [bookings, setBookings] = useState<GuestBookingHistory[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number to view booking history",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('get_guest_booking_history', {
        p_phone_number: searchQuery
      });

      if (error) {
        console.error('Error fetching booking history:', error);
        
        // Extract meaningful error message
        let errorMessage = "Failed to fetch booking history";
        if (error.message) {
          errorMessage = error.message;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        toast({
          title: "Search Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      setBookings(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "No Bookings Found",
          description: "No booking history found for this phone number",
        });
      }
    } catch (error) {
      console.error('Error fetching booking history:', error);
      
      // Extract meaningful error message from catch block
      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Search Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-blue-600 bg-blue-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleViewReceipt = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setShowReceiptModal(true);
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-righteous mb-2">Booking History</h1>
            <p className="text-purple-100 font-poppins text-sm sm:text-base">View your past bookings and receipts</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {/* Search Section */}
        <Card className="shadow-xl border-0 bg-white mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="font-righteous text-lg sm:text-xl text-gray-800">Find Your Bookings</CardTitle>
            <p className="text-gray-600 font-poppins text-sm">
              Enter your phone number to view your booking history
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 font-poppins">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter your phone number"
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

        {/* Booking History Results */}
        {bookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-righteous text-gray-800 mb-4">
              Found {bookings.length} booking{bookings.length > 1 ? 's' : ''}
            </h2>
            
            {bookings.map((booking) => (
              <Card key={booking.booking_id} className="shadow-lg border-0 bg-white">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-righteous text-lg text-gray-800">
                          {booking.shop_name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.booking_status)}`}>
                          {getStatusIcon(booking.booking_status)}
                          {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-start text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-poppins">{booking.shop_address}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleViewReceipt(booking.booking_id)}
                      variant="outline"
                      size="sm"
                      className="border-purple-200 text-purple-600 hover:bg-purple-50 w-full sm:w-auto"
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      View Receipt
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
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <p className="text-xs text-gray-500 font-poppins break-all">
                        Booking ID: {booking.booking_id}
                      </p>
                      <p className="text-xs text-gray-500 font-poppins">
                        Booked on {new Date(booking.created_at).toLocaleDateString()}
                      </p>
                    </div>
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
                No booking history found for this phone number.
                <br />
                Please check your phone number and try again.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt Modal */}
      <ReceiptViewModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        bookingId={selectedBookingId}
      />
    </div>
  );
};

export default GuestBookingHistoryPage;
