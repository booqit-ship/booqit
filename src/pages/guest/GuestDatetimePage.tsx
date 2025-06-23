
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

  // Generate only next 3 days for date selection (today, tomorrow, day after)
  const getNext3Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const availableDays = getNext3Days();

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
        {/* Booking Summary Card */}
        <Card className="border-l-4 border-l-booqit-primary bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-booqit-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold font-righteous text-gray-800">Quick Summary</h3>
                <p className="text-gray-600 text-sm font-poppins">Select your preferred slot</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">{guestInfo.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600 text-xs">{selectedStaffDetails?.name || 'Any Available Stylist'}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-right">
                  <span className="text-gray-600">{selectedServices?.length || 0} Services</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-booqit-primary">₹{totalPrice}</span>
                  <span className="text-gray-500 text-xs ml-1">({totalDuration}min)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-4 font-righteous text-gray-800">Choose Date</h3>
          <div className="grid grid-cols-3 gap-3">
            {availableDays.map((date, index) => {
              const isToday = index === 0;
              const isTomorrow = index === 1;
              const dayAfter = index === 2;
              
              let dayLabel = '';
              if (isToday) dayLabel = 'Today';
              else if (isTomorrow) dayLabel = 'Tomorrow';
              else dayLabel = formatDateInIST(date, 'EEE');

              return (
                <Card
                  key={date.toISOString()}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedDate?.toDateString() === date.toDateString()
                      ? 'border-booqit-primary bg-booqit-primary/5 shadow-md ring-2 ring-booqit-primary/20'
                      : 'border-gray-200 hover:border-booqit-primary/50'
                  }`}
                  onClick={() => handleDateSelect(date)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="font-semibold font-righteous text-gray-800 text-sm">
                      {dayLabel}
                    </div>
                    <div className="text-xs text-gray-600 font-poppins mt-1">
                      {formatDateInIST(date, 'MMM d')}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div>
            <h3 className="text-lg font-semibold mb-4 font-righteous text-gray-800">Available Times</h3>
            {isLoadingSlots ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-booqit-primary border-t-transparent"></div>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {availableSlots.map((slot) => (
                  <Card
                    key={`${slot.staff_id}-${slot.time_slot}`}
                    className={`cursor-pointer transition-all duration-200 ${
                      !slot.is_available
                        ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                        : selectedTime === slot.time_slot
                        ? 'border-booqit-primary bg-booqit-primary/5 shadow-md ring-2 ring-booqit-primary/20'
                        : 'border-gray-200 hover:border-booqit-primary/50 hover:shadow-sm'
                    }`}
                    onClick={() => slot.is_available && handleTimeSelect(slot.time_slot, slot.staff_id)}
                  >
                    <CardContent className="p-3 text-center">
                      <div className={`font-semibold font-righteous text-sm ${
                        slot.is_available ? 'text-gray-800' : 'text-gray-400'
                      }`}>
                        {formatTimeToAmPm(slot.time_slot)}
                      </div>
                      {!slot.is_available && (
                        <div className="text-xs text-red-500 font-poppins mt-1">
                          Booked
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-poppins">No slots available for this date</p>
                <p className="text-gray-400 text-sm font-poppins mt-1">Try selecting a different date</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-white text-base py-6 font-poppins font-medium disabled:opacity-50"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime || isLocking}
        >
          {isLocking ? 'Reserving Slot...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
};

export default GuestDatetimePage;
