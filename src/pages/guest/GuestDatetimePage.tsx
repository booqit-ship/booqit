
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { formatDateInIST, isTodayIST } from '@/utils/dateUtils';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import SlotSelector from '@/components/customer/SlotSelector';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason: string | null;
}

const GuestDatetimePage: React.FC = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    guestInfo, 
    merchant, 
    selectedServices, 
    totalPrice, 
    totalDuration,
    selectedStaff,
    selectedStaffDetails
  } = location.state || {};

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const [nextValidSlotTime, setNextValidSlotTime] = useState<string>('');
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);

  useEffect(() => {
    if (!guestInfo || !selectedServices || selectedServices.length === 0) {
      navigate(`/book/${merchantId}`);
      return;
    }
    
    fetchAvailableSlots();
  }, [selectedDate, merchantId, guestInfo, selectedServices]);

  const fetchAvailableSlots = async () => {
    if (!merchantId) return;

    setIsLoading(true);
    setError('');
    
    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: merchantId,
        p_date: formattedDate,
        p_staff_id: selectedStaff || null,
        p_service_duration: totalDuration || 30
      });

      if (slotsError) {
        console.error('Error fetching slots:', slotsError);
        setError('Failed to load available slots');
        return;
      }

      const slots = Array.isArray(slotsData) ? slotsData : [];
      setAvailableSlots(slots);
      
      const availableSlots = slots.filter(slot => slot.is_available);
      if (availableSlots.length > 0 && isTodayIST(selectedDate)) {
        setNextValidSlotTime(availableSlots[0].time_slot);
      }
      
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setError('Failed to load available slots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotClick = async (timeSlot: string) => {
    setIsCheckingSlot(true);
    try {
      setSelectedTime(timeSlot);
      toast.success('Time slot selected');
    } finally {
      setIsCheckingSlot(false);
    }
  };

  const handleContinue = () => {
    if (!selectedTime) {
      toast.error('Please select a time slot');
      return;
    }

    navigate(`/guest-payment/${merchantId}`, {
      state: {
        guestInfo,
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff,
        selectedStaffDetails,
        bookingDate: selectedDate.toISOString().split('T')[0],
        bookingTime: selectedTime,
        isGuestBooking: true
      }
    });
  };

  const getDayButtons = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  if (!guestInfo || !selectedServices) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Booking Information Missing</h1>
          <p className="text-gray-600">Please start the booking process again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute left-0 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium font-righteous">Select Date & Time</h1>
        </div>
      </div>

      <div className="p-4">
        {/* Booking Summary */}
        <Card className="mb-6 border-booqit-primary/20">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 font-righteous">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-poppins">Services:</span>
                <span>{selectedServices.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span className="font-poppins">Total Duration:</span>
                <span>{totalDuration} minutes</span>
              </div>
              {selectedStaffDetails && (
                <div className="flex justify-between">
                  <span className="font-poppins">Stylist:</span>
                  <span>{selectedStaffDetails.name}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span className="font-poppins">Total Price:</span>
                <span>₹{totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <div className="mb-6">
          <h3 className="font-medium mb-3 flex items-center font-righteous">
            <Calendar className="h-4 w-4 mr-2" />
            Select Date
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {getDayButtons().map((date, index) => (
              <Button
                key={index}
                variant={selectedDate.toDateString() === date.toDateString() ? "default" : "outline"}
                className={`p-3 h-auto flex flex-col font-poppins ${
                  selectedDate.toDateString() === date.toDateString() 
                    ? 'bg-booqit-primary hover:bg-booqit-primary/90' 
                    : ''
                }`}
                onClick={() => setSelectedDate(date)}
              >
                <span className="text-xs">
                  {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : formatDateInIST(date, 'EEE')}
                </span>
                <span className="text-lg font-bold">{date.getDate()}</span>
                <span className="text-xs">{formatDateInIST(date, 'MMM')}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Time Slot Selection */}
        <SlotSelector
          selectedDate={selectedDate}
          availableSlots={availableSlots}
          selectedTime={selectedTime}
          loading={isLoading}
          error={error}
          lastRefreshTime={lastRefreshTime}
          nextValidSlotTime={nextValidSlotTime}
          isCheckingSlot={isCheckingSlot}
          onSlotClick={handleSlotClick}
          onRefresh={fetchAvailableSlots}
        />
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedTime}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default GuestDatetimePage;
