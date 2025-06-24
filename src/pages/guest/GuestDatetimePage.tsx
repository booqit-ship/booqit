
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useSlotLocking } from '@/hooks/useSlotLocking';
import { useUnifiedSlots } from '@/hooks/useUnifiedSlots';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import SlotSelector from '@/components/customer/SlotSelector';

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
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);
  const { lockSlot, isLocking } = useSlotLocking();

  // Use unified slots hook for consistency with regular users
  const {
    availableSlots,
    isLoading: isLoadingSlots,
    error,
    lastRefreshTime,
    nextValidSlotTime,
    refreshSlots
  } = useUnifiedSlots({
    merchantId: merchantId!,
    selectedDate,
    selectedStaff,
    totalDuration: totalDuration || 30,
    onSlotChange: () => {
      console.log('GUEST_DATETIME: Slots changed, checking if selected time is still valid');
      if (selectedTime && availableSlots.length > 0) {
        const isStillAvailable = availableSlots.some(slot => 
          slot.time_slot === selectedTime && slot.is_available
        );
        if (!isStillAvailable) {
          setSelectedTime('');
          toast.info('Your selected time slot is no longer available');
        }
      }
    }
  });

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

  const handleDateSelect = (date: Date) => {
    console.log('GUEST DATETIME: Date selected:', formatDateInIST(date, 'yyyy-MM-dd'));
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleTimeSelect = async (timeSlot: string) => {
    console.log('GUEST DATETIME: Time slot selected:', timeSlot);
    setIsCheckingSlot(true);
    
    try {
      setSelectedTime(timeSlot);
      
      // Optional: Lock the slot if specific staff is selected
      if (selectedStaff && selectedDate) {
        await lockSlot(
          selectedStaff, 
          formatDateInIST(selectedDate, 'yyyy-MM-dd'), 
          timeSlot, 
          totalDuration || 30
        );
      }
    } finally {
      setIsCheckingSlot(false);
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

  // Generate next 3 days for date selection
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

        {/* Time Slots using SlotSelector component for consistency */}
        {selectedDate && (
          <SlotSelector
            selectedDate={selectedDate}
            availableSlots={availableSlots}
            selectedTime={selectedTime}
            loading={isLoadingSlots}
            error={error}
            lastRefreshTime={lastRefreshTime}
            nextValidSlotTime={nextValidSlotTime}
            isCheckingSlot={isCheckingSlot}
            onSlotClick={handleTimeSelect}
            onRefresh={refreshSlots}
          />
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-white text-base py-6 font-poppins font-medium disabled:opacity-50"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime || isLocking || isCheckingSlot}
        >
          {isLocking || isCheckingSlot ? 'Reserving Slot...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
};

export default GuestDatetimePage;
