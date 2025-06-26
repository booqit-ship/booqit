
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, ArrowLeft, Calendar, MapPin, User, Clock, FileText, Download, Eye } from 'lucide-react';
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
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [bookings, setBookings] = useState<GuestBookingHistory[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('get_guest_booking_history', {
        p_phone_number: phoneNumber.trim()
      });

      if (error) {
        console.error('Error fetching booking history:', error);
        toast({
          title: "Search Error",
          description: "Failed to fetch booking history",
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
      toast({
        title: "Search Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewReceipt = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setShowReceiptModal(true);
  };

  const handleDownloadReceipt = async (bookingId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_guest_booking_receipt_data', {
        p_booking_id: bookingId
      });

      if (error) {
        toast({
          title: "Receipt Error",
          description: "Failed to generate receipt data",
          variant: "destructive",
        });
        return;
      }

      const result = data as { success: boolean; data?: any; error?: string };
      
      if (!result.success || !result.data) {
        toast({
          title: "Receipt Error",
          description: result.error || "Receipt data not available",
          variant: "destructive",
        });
        return;
      }

      // Import the receipt download utility dynamically
      const { triggerAutoDownload } = await import('@/utils/receiptDownload');
      
      // Create receipt element temporarily for download
      const receiptElement = document.createElement('div');
      receiptElement.id = `receipt-${bookingId}`;
      receiptElement.style.position = 'absolute';
      receiptElement.style.left = '-9999px';
      document.body.appendChild(receiptElement);

      // Generate and download receipt
      await triggerAutoDownload(result.data, receiptElement.id, 500);
      
      // Clean up
      document.body.removeChild(receiptElement);
      
      toast({
        title: "Receipt Downloaded",
        description: "Receipt has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast({
        title: "Download Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
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

  const formatCreatedDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white font-righteous mb-2">Booking History</h1>
            <p className="text-purple-100 font-poppins">View all your past bookings and download receipts</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Section */}
        <Card className="shadow-xl border-0 bg-white mb-6">
          <CardHeader>
            <CardTitle className="font-righteous text-xl text-gray-800">Find Your Booking History</CardTitle>
            <p className="text-gray-600 font-poppins text-sm">
              Enter your phone number to view all your booking history
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 font-poppins">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="h-12 font-poppins border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="h-12 mt-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <Search className="w-5 h-5 mr-2" />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Booking History Results */}
        {bookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-righteous text-gray-800 mb-4">
              Found {bookings.length} booking{bookings.length > 1 ? 's' : ''} in your history
            </h2>
            
            {bookings.map((booking) => (
              <Card key={booking.booking_id} className="shadow-lg border-0 bg-white">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-righteous text-lg text-gray-800">
                          {booking.shop_name}
                        </h3>
                        <Badge className={getStatusColor(booking.booking_status)}>
                          {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm font-poppins">{booking.shop_address}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-poppins">
                        Booked on {formatCreatedDate(booking.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleViewReceipt(booking.booking_id)}
                        variant="outline"
                        size="sm"
                        className="border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Receipt
                      </Button>
                      <Button
                        onClick={() => handleDownloadReceipt(booking.booking_id)}
                        variant="outline"
                        size="sm"
                        className="border-green-200 text-green-600 hover:bg-green-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-purple-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-800">{formatDate(booking.booking_date)}</p>
                        <p className="text-sm text-gray-600">{formatTime(booking.booking_time)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <User className="w-5 h-5 text-purple-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-800">{booking.customer_name}</p>
                        <p className="text-sm text-gray-600">{booking.customer_phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
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
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">₹{booking.service_price}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-poppins">
                      Booking ID: {booking.booking_id}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No bookings message when searched but nothing found */}
        {phoneNumber && !isSearching && bookings.length === 0 && (
          <Card className="shadow-lg border-0 bg-white text-center py-12">
            <CardContent>
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-righteous text-gray-800 mb-2">No Booking History</h3>
              <p className="text-gray-600 font-poppins">
                No bookings were found for this phone number.
                <br />
                Please check the phone number and try again.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt View Modal */}
      <ReceiptViewModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        bookingId={selectedBookingId}
      />
    </div>
  );
};

export default GuestBookingHistoryPage;
