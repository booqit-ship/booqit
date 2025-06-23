
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSlotLocking } from '@/hooks/useSlotLocking';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';

interface TimeSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason?: string;
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

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const { lockSlot, isLocking } = useSlotLocking();

  console.log('GUEST DATETIME: Page loaded with state:', {
    guestInfo: !!guestInfo,
    merchant: !!merchant,
    selectedServices: selectedServices?.length || 0,
    totalPrice,
    totalDuration,
    selectedStaff: selectedStaff || 'Any available',
    selectedStaffDetails: selectedStaffDetails?.name || 'Any available stylist'
  });

  useEffect(() => {
    if (!guestInfo || !selectedServices || selectedServices.length === 0) {
      console.log('GUEST DATETIME: Missing required data, redirecting...');
      navigate(`/book/${merchantId}`);
      return;
    }
  }, [merchantId, guestInfo, selectedServices]);

  // Realtime slots hook
  useRealtimeSlots({
    selectedDate,
    selectedStaff,
    merchantId: merchantId!,
    onSlotChange: () => {
      if (selectedDate) {
        fetchAvailableSlots(selectedDate);
      }
    },
    selectedTime,
    onSelectedTimeInvalidated: () => {
      setSelectedTime('');
      toast.info('Your selected time slot is no longer available');
    }
  });

  const fetchAvailableSlots = async (date: Date) => {
    if (!merchantId || !date) return;

    setIsLoadingSlots(true);
    try {
      const dateStr = formatDateInIST(date, 'yyyy-MM-dd');
      console.log('GUEST DATETIME: Fetching slots for:', { dateStr, selectedStaff, totalDuration });

      const { data: slotsData, error } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: merchantId,
        p_date: dateStr,
        p_staff_id: selectedStaff || null,
        p_service_duration: totalDuration || 30
      });

      if (error) throw error;

      console.log('GUEST DATETIME: Slots fetched:', slotsData?.length || 0);
      setAvailableSlots(slotsData || []);
    } catch (error) {
      console.error('GUEST DATETIME: Error fetching slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    console.log('GUEST DATETIME: Date selected:', formatDateInIST(date, 'yyyy-MM-dd'));
    setSelectedDate(date);
    setSelectedTime('');
    fetchAvailableSlots(date);
  };

  const handleTimeSelect = async (timeSlot: string, staffId: string) => {
    if (!selectedDate) return;

    console.log('GUEST DATETIME: Time slot selected:', { timeSlot, staffId });
    setSelectedTime(timeSlot);

    // Optional: Lock the slot (if you want to reserve it temporarily)
    if (selectedStaff) {
      await lockSlot(selectedStaff, formatDateInIST(selectedDate, 'yyyy-MM-dd'), timeSlot, totalDuration || 30);
    }
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    console.log('GUEST DATETIME: Continuing to payment with:', {
      guestInfo,
      selectedStaff: selectedStaff || 'Any available stylist',
      selectedStaffDetails: selectedStaffDetails?.name || 'Any available stylist',
      bookingDate: formatDateInIST(selectedDate, 'yyyy-MM-dd'),
      bookingTime: selectedTime
    });

    // Navigate to payment page
    navigate(`/guest-payment/${merchantId}`, {
      state: {
        guestInfo,
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff: selectedStaff || null,
        selectedStaffDetails: selectedStaffDetails || { name: 'Any Available Stylist' },
        bookingDate: formatDateInIST(selectedDate, 'yyyy-MM-dd'),
        bookingTime: selectedTime
      }
    });
  };

  // Generate next 7 days for date selection
  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const availableDays = getNext7Days();

  if (!guestInfo || !selectedServices || selectedServices.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Booking Information Missing</h1>
          <p className="text-gray-600">Please start the booking process again.</p>
          <Button 
            onClick={() => navigate(`/book/${merchantId}`)}
            className="mt-4"
          >
            Start Over
          </Button>
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

      <div className="p-4 space-y-6">
        {/* Booking Summary */}
        <Card className="border-booqit-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold font-righteous">Booking Summary</h3>
                <p className="text-gray-600 font-poppins">Select your preferred date and time</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium font-poppins">Guest: {guestInfo.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium font-poppins">Stylist: {selectedStaffDetails?.name || 'Any Available Stylist'}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-poppins">Services:</span>
                <span>{selectedServices?.length || 0} selected</span>
              </div>
              <div className="flex justify-between">
                <span className="font-poppins">Total Duration:</span>
                <span>{totalDuration} minutes</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span className="font-poppins">Total Price:</span>
                <span>₹{totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-3 font-righteous">Select Date</h3>
          <div className="grid grid-cols-2 gap-2">
            {availableDays.map((date) => (
              <Card
                key={date.toISOString()}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedDate?.toDateString() === date.toDateString()
                    ? 'border-booqit-primary bg-booqit-primary/5 shadow-md'
                    : 'hover:shadow-md border-l-4 border-l-gray-200 hover:border-l-booqit-primary'
                }`}
                onClick={() => handleDateSelect(date)}
              >
                <CardContent className="p-3">
                  <div className="text-center">
                    <div className="font-semibold font-righteous">
                      {formatDateInIST(date, 'EEE')}
                    </div>
                    <div className="text-sm text-gray-600 font-poppins">
                      {formatDateInIST(date, 'MMM d')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div>
            <h3 className="text-lg font-semibold mb-3 font-righteous">Available Time Slots</h3>
            {isLoadingSlots ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((slot) => (
                  <Card
                    key={`${slot.staff_id}-${slot.time_slot}`}
                    className={`cursor-pointer transition-all duration-200 ${
                      !slot.is_available
                        ? 'opacity-50 cursor-not-allowed bg-gray-100'
                        : selectedTime === slot.time_slot
                        ? 'border-booqit-primary bg-booqit-primary/5 shadow-md'
                        : 'hover:shadow-md border-l-4 border-l-gray-200 hover:border-l-booqit-primary'
                    }`}
                    onClick={() => slot.is_available && handleTimeSelect(slot.time_slot, slot.staff_id)}
                  >
                    <CardContent className="p-3">
                      <div className="text-center">
                        <div className="font-semibold font-righteous">
                          {formatTimeToAmPm(slot.time_slot)}
                        </div>
                        {!slot.is_available && (
                          <div className="text-xs text-red-500 font-poppins mt-1">
                            {slot.conflict_reason || 'Not Available'}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-poppins">No available slots for this date</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime || isLocking}
        >
          {isLocking ? 'Reserving...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
};

export default GuestDatetimePage;
