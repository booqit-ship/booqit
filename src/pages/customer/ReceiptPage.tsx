
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Check, Download, ChevronLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Booking, Service, Merchant } from '@/types';

interface ReceiptDetails {
  bookingId: string;
  bookingDate: string;
  bookingTime: string;
  serviceName: string;
  servicePrice: number;
  merchantName: string;
  paymentMethod: string;
  staffId?: string;
}

const ReceiptPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  
  // Use location state if available, otherwise fetch from API
  const receiptDetails = location.state as ReceiptDetails;

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        if (!bookingId) return;

        // Fetch booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            service:service_id(*),
            merchant:merchant_id(*)
          `)
          .eq('id', bookingId)
          .single();

        if (bookingError) throw bookingError;
        
        if (bookingData) {
          setBooking(bookingData);
          setService(bookingData.service);
          setMerchant(bookingData.merchant);
        }
      } catch (error) {
        console.error('Error fetching booking details:', error);
        toast.error('Could not load booking details');
      } finally {
        setLoading(false);
      }
    };

    if (!receiptDetails) {
      fetchBookingDetails();
    } else {
      setLoading(false);
    }
  }, [bookingId, receiptDetails]);

  const handleAddToCalendar = () => {
    // Get data either from state or fetched data
    const bookingDate = receiptDetails?.bookingDate || booking?.date;
    const bookingTime = receiptDetails?.bookingTime || booking?.time_slot;
    const serviceName = receiptDetails?.serviceName || service?.name;
    const merchantName = receiptDetails?.merchantName || merchant?.shop_name;
    
    if (!bookingDate || !bookingTime || !serviceName || !merchantName) {
      toast.error("Couldn't create calendar event");
      return;
    }

    // Create Google Calendar URL
    const [hours, minutes] = bookingTime.split(':').map(Number);
    const startDate = new Date(bookingDate);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (service?.duration || 60));
    
    // Format dates for Google Calendar
    const formatForGCal = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    const googleCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${serviceName} appointment`)}&details=${encodeURIComponent(`Appointment at ${merchantName}`)}&location=${encodeURIComponent(merchant?.address || '')}&dates=${formatForGCal(startDate)}/${formatForGCal(endDate)}`;
    
    window.open(googleCalUrl, '_blank');
  };
  
  const handleDownloadReceipt = () => {
    // In a real app, this would generate a PDF receipt
    toast.success('Receipt download started');
  };
  
  const handleGoToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Use data from either location state or fetched data
  const displayData = {
    bookingId: receiptDetails?.bookingId || booking?.id || '',
    bookingDate: receiptDetails?.bookingDate || booking?.date || '',
    bookingTime: receiptDetails?.bookingTime || booking?.time_slot || '',
    serviceName: receiptDetails?.serviceName || service?.name || '',
    servicePrice: receiptDetails?.servicePrice || service?.price || 0,
    merchantName: receiptDetails?.merchantName || merchant?.shop_name || '',
    paymentMethod: receiptDetails?.paymentMethod || 'card',
  };

  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      <div className="relative bg-booqit-primary text-white p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 text-white hover:bg-white/20"
          onClick={handleGoToHome}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-center text-xl font-medium">Receipt</h1>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Success message */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="mt-4 text-xl font-medium">Booking Confirmed!</h2>
          <p className="text-gray-500 mt-1">Your appointment has been successfully booked</p>
        </div>
        
        {/* Receipt Card */}
        <Card className="overflow-hidden">
          <div className="bg-booqit-primary text-white p-4">
            <h3 className="font-medium">Booking #{displayData.bookingId.substring(0, 8)}</h3>
          </div>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm text-gray-500">Service</h4>
                <p className="font-medium">{displayData.serviceName}</p>
              </div>
              
              <div>
                <h4 className="text-sm text-gray-500">Merchant</h4>
                <p className="font-medium">{displayData.merchantName}</p>
              </div>
              
              <div className="flex space-x-6">
                <div>
                  <h4 className="text-sm text-gray-500">Date</h4>
                  <p className="font-medium">{displayData.bookingDate}</p>
                </div>
                
                <div>
                  <h4 className="text-sm text-gray-500">Time</h4>
                  <p className="font-medium">{displayData.bookingTime}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm text-gray-500">Payment Method</h4>
                <p className="font-medium capitalize">{displayData.paymentMethod}</p>
              </div>
              
              <div className="flex justify-between items-center">
                <h4 className="text-sm text-gray-500">Amount Paid</h4>
                <p className="font-medium text-lg">₹{displayData.servicePrice}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full flex items-center justify-center"
            variant="outline"
            onClick={handleAddToCalendar}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Add to Calendar
          </Button>
          
          <Button 
            className="w-full flex items-center justify-center"
            variant="outline"
            onClick={handleDownloadReceipt}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
          
          <Button 
            className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
            onClick={handleGoToHome}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage;
