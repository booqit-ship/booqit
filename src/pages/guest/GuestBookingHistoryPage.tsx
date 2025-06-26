
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, Calendar, Clock, MapPin, User, Download, Eye, History } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import ReceiptViewModal from '@/components/guest/ReceiptViewModal';

interface HistoryBookingData {
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
  created_at: string;
  merchant_id: string;
}

const GuestBookingHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bookings, setBookings] = useState<HistoryBookingData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const handleSearch = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('get_guest_booking_history', {
        p_phone_number: cleanPhone
      });

      if (error) {
        console.error('Search error:', error);
        toast.error('Failed to search booking history');
        return;
      }

      if (!data || data.length === 0) {
        toast.info('No booking history found for this phone number');
        setBookings([]);
        return;
      }

      setBookings(data);
      toast.success(`Found ${data.length} booking(s) in your history`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search booking history');
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewReceipt = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setShowReceiptModal(true);
  };

  const handleDownloadReceipt = async (booking: HistoryBookingData) => {
    try {
      // Get detailed receipt data
      const { data, error } = await supabase.rpc('get_guest_booking_receipt_data', {
        p_booking_id: booking.booking_id
      });

      if (error || !data.success) {
        toast.error('Failed to generate receipt data');
        return;
      }

      // Use existing receipt download utility
      const { downloadReceiptImage } = await import('@/utils/receiptDownload');
      
      // Create a temporary receipt element
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = `
        <div id="temp-receipt-${booking.booking_id}" style="position: fixed; left: -9999px; top: -9999px;">
          <!-- Receipt content will be rendered here -->
        </div>
      `;
      document.body.appendChild(tempDiv);

      // Download the receipt
      await downloadReceiptImage(data.data, `temp-receipt-${booking.booking_id}`);
      
      // Clean up
      document.body.removeChild(tempDiv);
      
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download receipt');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-10 shadow-lg">
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
            <h1 className="text-xl font-medium font-righteous">Booking History</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Search Section */}
        <Card className="mb-6 border-blue-200 bg-white shadow-lg">
          <CardContent className="p-5">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 font-righteous text-gray-800">Find Your Booking History</h3>
                <p className="text-gray-600 text-sm font-poppins">
                  Enter your phone number to view all your past bookings and download receipts
                </p>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 font-poppins">
                  Phone Number
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setPhoneNumber(value);
                    }}
                    className="pl-10 h-12 font-poppins"
                    placeholder="Enter your phone number"
                    maxLength={10}
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
                disabled={isSearching || !phoneNumber.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 font-poppins font-medium"
              >
                {isSearching ? 'Searching...' : 'View Booking History'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {bookings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold font-righteous text-gray-800">
                Your Booking History ({bookings.length})
              </h3>
            </div>

            {bookings.map((booking) => (
              <Card key={booking.booking_id} className="border-gray-200 bg-white shadow-lg">
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {/* Status and Booking ID */}
                    <div className="flex justify-between items-start">
                      <div className="text-center p-3 bg-gray-50 rounded-lg flex-1 mr-3">
                        <p className="text-xs text-gray-600 font-poppins mb-1">Booking ID</p>
                        <p className="font-mono text-sm font-semibold text-gray-800">
                          {booking.booking_id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className={`px-3 py-2 rounded-full text-sm font-medium font-poppins ${getStatusColor(booking.booking_status)}`}>
                        {getStatusText(booking.booking_status)}
                      </div>
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

                    {/* Receipt Actions */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleViewReceipt(booking.booking_id)}
                        variant="outline"
                        className="flex-1 h-10 border-blue-300 text-blue-600 hover:bg-blue-50 font-poppins"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Receipt
                      </Button>
                      <Button 
                        onClick={() => handleDownloadReceipt(booking)}
                        variant="outline"
                        className="flex-1 h-10 border-green-300 text-green-600 hover:bg-green-50 font-poppins"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {bookings.length === 0 && phoneNumber && !isSearching && (
          <Card className="border-gray-200 bg-white shadow-lg">
            <CardContent className="p-8 text-center">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold font-righteous text-gray-800 mb-2">No Booking History Found</h3>
              <p className="text-gray-600 font-poppins text-sm">
                We couldn't find any booking history for this phone number. 
                Please check the phone number and try again.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt View Modal */}
      {showReceiptModal && selectedBookingId && (
        <ReceiptViewModal
          bookingId={selectedBookingId}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedBookingId(null);
          }}
        />
      )}
    </div>
  );
};

export default GuestBookingHistoryPage;
