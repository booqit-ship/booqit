
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, ArrowLeft, Calendar, MapPin, User, Clock, FileText, Download, Eye, Loader2 } from 'lucide-react';
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
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

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
    setIsDownloading(bookingId);
    try {
      const { data, error } = await supabase.rpc('get_guest_booking_receipt_data', {
        p_booking_id: bookingId
      });

      if (error) {
        console.error('Receipt fetch error:', error);
        toast({
          title: "Receipt Error",
          description: "Failed to generate receipt data",
          variant: "destructive",
        });
        return;
      }

      const result = data as { success: boolean; data?: any; error?: string };
      
      if (!result || !result.success || !result.data) {
        toast({
          title: "Receipt Error",
          description: result?.error || "Receipt data not available",
          variant: "destructive",
        });
        return;
      }

      // Import the receipt download utility and ReceiptTemplate dynamically
      const [
        { downloadReceiptImage },
        { default: ReceiptTemplate }
      ] = await Promise.all([
        import('@/utils/receiptDownload'),
        import('@/components/receipt/ReceiptTemplate')
      ]);
      
      // Create temporary receipt container
      const receiptContainer = document.createElement('div');
      receiptContainer.id = `receipt-download-${bookingId}`;
      receiptContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: 800px;
        background: white;
        padding: 32px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      document.body.appendChild(receiptContainer);
      
      // Import React and ReactDOM for rendering
      const React = await import('react');
      const ReactDOM = await import('react-dom/client');
      
      // Create root and render the receipt
      const root = ReactDOM.createRoot(receiptContainer);
      root.render(React.createElement(ReceiptTemplate, { 
        data: result.data, 
        forImage: true 
      }));
      
      // Wait for render to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate and download receipt
      await downloadReceiptImage(result.data, receiptContainer.id);
      
      // Clean up
      root.unmount();
      document.body.removeChild(receiptContainer);
      
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
    } finally {
      setIsDownloading(null);
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
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 touch-manipulation"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-righteous mb-2">Booking History</h1>
            <p className="text-purple-100 font-poppins text-xs sm:text-sm md:text-base">View all your past bookings and download receipts</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Search Section */}
        <Card className="shadow-xl border-0 bg-white mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="font-righteous text-base sm:text-lg md:text-xl text-gray-800">Find Your Booking History</CardTitle>
            <p className="text-gray-600 font-poppins text-xs sm:text-sm">
              Enter your phone number to view all your booking history
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row">
              <div className="flex-1">
                <Label htmlFor="phone" className="text-xs sm:text-sm font-medium text-gray-700 font-poppins">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="h-10 sm:h-12 font-poppins border-gray-200 focus:border-purple-500 focus:ring-purple-500 touch-manipulation text-sm sm:text-base"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="h-10 sm:h-12 sm:mt-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 touch-manipulation min-h-[44px] text-sm sm:text-base px-4 sm:px-6"
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
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg md:text-xl font-righteous text-gray-800 mb-4">
              Found {bookings.length} booking{bookings.length > 1 ? 's' : ''} in your history
            </h2>
            
            {bookings.map((booking) => (
              <Card key={booking.booking_id} className="shadow-lg border-0 bg-white">
                <CardContent className="p-3 sm:p-4 md:p-6">
                  {/* Header with shop name and status */}
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="font-righteous text-base sm:text-lg text-gray-800 truncate">
                            {booking.shop_name}
                          </h3>
                          <Badge className={`${getStatusColor(booking.booking_status)} text-xs sm:text-sm w-fit`}>
                            {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-start text-gray-600 mb-2">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-poppins break-words leading-tight">{booking.shop_address}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-poppins">
                          Booked on {formatCreatedDate(booking.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Stack vertically on mobile */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                      <Button
                        onClick={() => handleViewReceipt(booking.booking_id)}
                        variant="outline"
                        size="sm"
                        className="border-purple-200 text-purple-600 hover:bg-purple-50 touch-manipulation min-h-[44px] w-full text-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Receipt
                      </Button>
                      <Button
                        onClick={() => handleDownloadReceipt(booking.booking_id)}
                        variant="outline"
                        size="sm"
                        className="border-green-200 text-green-600 hover:bg-green-50 touch-manipulation min-h-[44px] w-full text-sm"
                        disabled={isDownloading === booking.booking_id}
                      >
                        {isDownloading === booking.booking_id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Booking Details Grid */}
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mr-3 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 text-sm sm:text-base break-words">{formatDate(booking.booking_date)}</p>
                        <p className="text-xs sm:text-sm text-gray-600">{formatTime(booking.booking_time)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mr-3 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 text-sm sm:text-base break-words">{booking.customer_name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 break-all">{booking.customer_phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-purple-800 text-sm sm:text-base break-words">{booking.service_name}</p>
                        <div className="flex flex-wrap items-center text-purple-600 text-xs sm:text-sm gap-1 mt-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{booking.service_duration} minutes</span>
                          {booking.stylist_name && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="break-words">with {booking.stylist_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">₹{booking.service_price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Booking ID */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
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
        {phoneNumber && !isSearching && bookings.length === 0 && (
          <Card className="shadow-lg border-0 bg-white text-center py-8 sm:py-12">
            <CardContent>
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg md:text-xl font-righteous text-gray-800 mb-2">No Booking History</h3>
              <p className="text-gray-600 font-poppins text-sm sm:text-base px-4">
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
