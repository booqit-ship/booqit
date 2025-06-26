import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, User, MapPin, RefreshCw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { 
  formatDateInIST, 
  getCurrentDateIST, 
  getCurrentTimeIST,
  getCurrentTimeISTWithBuffer,
  isTodayIST, 
  addDays 
} from '@/utils/dateUtils';

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

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  const getNext3Days = () => {
    const days = [];
    const today = getCurrentDateIST();
    for (let i = 0; i < 3; i++) {
      const date = addDays(today, i);
      days.push(date);
    }
    return days;
  };

  const availableDays = getNext3Days();

  useEffect(() => {
    if (availableDays.length > 0 && !selectedDate) {
      setSelectedDate(availableDays[0]);
    }
  }, [availableDays.length]);

  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDate || !merchantId || !totalDuration) return;

    setIsLoading(true);
    setError('');
    
    try {
      const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      const isToday = isTodayIST(selectedDate);
      
      const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: merchantId,
        p_date: selectedDateStr,
        p_staff_id: selectedStaff || null,
        p_service_duration: totalDuration
      });

      if (slotsError) {
        console.error('DATETIME: Error fetching slots:', slotsError);
        setError('Unable to load time slots. Please try again.');
        setAvailableSlots([]);
        return;
      }

      const slots = Array.isArray(slotsData) ? slotsData : [];
      
      let filteredSlots = slots;
      if (isToday) {
        const currentBufferTime = getCurrentTimeISTWithBuffer(40);
        filteredSlots = slots.filter(slot => {
          const slotTime = typeof slot.time_slot === 'string' 
            ? slot.time_slot.substring(0, 5) 
            : formatDateInIST(new Date(`2000-01-01T${slot.time_slot}`), 'HH:mm');
          return slotTime >= currentBufferTime;
        });
      }
      
      if (filteredSlots.length === 0) {
        const errorMsg = isToday 
          ? `No slots available today after ${getCurrentTimeISTWithBuffer(40)} for ${totalDuration} minutes` 
          : `No slots available for this date for ${totalDuration} minutes duration`;
        setError(errorMsg);
        setAvailableSlots([]);
        return;
      }

      const processedSlots = filteredSlots.map((slot: any) => ({
        staff_id: slot.staff_id,
        staff_name: slot.staff_name,
        time_slot: typeof slot.time_slot === 'string' 
          ? slot.time_slot.substring(0, 5) 
          : formatDateInIST(new Date(`2000-01-01T${slot.time_slot}`), 'HH:mm'),
        is_available: slot.is_available,
        conflict_reason: slot.conflict_reason
      }));
      
      setAvailableSlots(processedSlots);
      setLastRefreshTime(new Date());

    } catch (error) {
      console.error('DATETIME: Error fetching slots:', error);
      setError('Unable to load time slots. Please try again.');
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, merchantId, selectedStaff, totalDuration]);

  useEffect(() => {
    fetchAvailableSlots();
    setSelectedTime('');

    const isToday = selectedDate && isTodayIST(selectedDate);
    if (isToday) {
      const interval = setInterval(() => {
        fetchAvailableSlots();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [fetchAvailableSlots]);

  useEffect(() => {
    if (!merchantId || !selectedDate) return;

    console.log('GUEST_DATETIME: Setting up realtime subscriptions');
    
    const bookingChannel = supabase
      .channel('guest-booking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `merchant_id=eq.${merchantId}`
        },
        (payload) => {
          console.log('GUEST_DATETIME: Booking change detected:', payload);
          
          const booking = payload.new || payload.old;
          if (!booking || typeof booking !== 'object' || !selectedDate) return;
          
          if (!('date' in booking) || !('staff_id' in booking)) return;
          
          const bookingDate = new Date(booking.date as string);
          const currentViewDate = selectedDate;
          
          if (bookingDate.toDateString() === currentViewDate.toDateString()) {
            if (!selectedStaff || booking.staff_id === selectedStaff) {
              console.log('GUEST_DATETIME: Relevant booking change, refreshing slots');
              
              // Check if selected time is affected
              if (selectedTime && 'time_slot' in booking && booking.time_slot === selectedTime) {
                if (payload.eventType === 'INSERT') {
                  toast.info('Selected slot is no longer available');
                  setSelectedTime('');
                }
              }
              
              // Refresh slots after a short delay
              setTimeout(() => {
                fetchAvailableSlots();
              }, 500);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('GUEST_DATETIME: Cleaning up realtime subscriptions');
      supabase.removeChannel(bookingChannel);
    };
  }, [merchantId, selectedDate, selectedStaff, fetchAvailableSlots, selectedTime]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleTimeSelect = (timeSlot: string) => {
    if (selectedDate && isTodayIST(selectedDate)) {
      const currentBufferTime = getCurrentTimeISTWithBuffer(40);
      if (timeSlot < currentBufferTime) {
        toast.error('This time slot is no longer available due to time passing');
        fetchAvailableSlots();
        return;
      }
    }
    
    const availableSlot = availableSlots.find(slot => 
      slot.time_slot === timeSlot && slot.is_available
    );
    
    if (!availableSlot) {
      toast.error(`This time slot is not available for ${totalDuration} minutes total duration`);
      return;
    }

    setSelectedTime(timeSlot);
    toast.success('Time slot selected!');
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

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

  const formatDateDisplay = (date: Date) => {
    const todayIST = getCurrentDateIST();
    const tomorrowIST = addDays(todayIST, 1);
    
    if (formatDateInIST(date, 'yyyy-MM-dd') === formatDateInIST(todayIST, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (formatDateInIST(date, 'yyyy-MM-dd') === formatDateInIST(tomorrowIST, 'yyyy-MM-dd')) {
      return 'Tomorrow';
    } else {
      return formatDateInIST(date, 'EEE, MMM d');
    }
  };

  const availableTimeSlots = availableSlots.filter(slot => slot.is_available);
  const uniqueAvailableSlots = Array.from(new Map(
    availableTimeSlots.map(slot => [slot.time_slot, slot])
  ).values()).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  if (!guestInfo || !selectedServices || selectedServices.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Booking Information Missing</h1>
          <p className="text-gray-600 font-poppins">Please start the booking process again.</p>
          <Button 
            onClick={() => navigate(`/book/${merchantId}`)}
            className="mt-4 bg-purple-600 hover:bg-purple-700"
          >
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  const isToday = selectedDate && isTodayIST(selectedDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0 z-10 shadow-lg">
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
            <h1 className="text-xl font-medium font-righteous">Select Date & Time</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Booking Summary Card */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold font-righteous text-purple-800">Quick Summary</h3>
                <p className="text-purple-600 text-sm font-poppins">Select your preferred slot</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-purple-700">{guestInfo.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-500" />
                  <span className="text-purple-600 text-xs">{selectedStaffDetails?.name || 'Any Available Stylist'}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-right">
                  <span className="text-purple-600">{selectedServices?.length || 0} Services</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-purple-700">₹{totalPrice}</span>
                  <span className="text-purple-500 text-xs ml-1">({totalDuration}min)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <div>
          <h3 className="text-xl font-semibold mb-4 font-righteous text-gray-800">Choose Date</h3>
          <div className="grid grid-cols-3 gap-3">
            {availableDays.map((date) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString();

              return (
                <Card
                  key={date.toISOString()}
                  className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    isSelected
                      ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg ring-2 ring-purple-200'
                      : 'border-gray-200 hover:border-purple-300 bg-white hover:shadow-lg'
                  }`}
                  onClick={() => handleDateSelect(date)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="font-semibold font-righteous text-gray-800 text-sm">
                      {formatDateDisplay(date)}
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

        {/* Time Selection */}
        {selectedDate && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold font-righteous text-gray-800">Available Times</h3>
              {isToday && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAvailableSlots}
                  disabled={isLoading}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-gray-600 font-poppins">Loading available times...</p>
              </div>
            ) : error ? (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <p className="text-red-600 font-poppins">{error}</p>
                </CardContent>
              </Card>
            ) : uniqueAvailableSlots.length === 0 ? (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-6 text-center">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-poppins">No available time slots for this date</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {uniqueAvailableSlots.map((slot) => (
                  <Card
                    key={slot.time_slot}
                    className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                      selectedTime === slot.time_slot
                        ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-purple-300 bg-white hover:shadow-lg'
                    }`}
                    onClick={() => handleTimeSelect(slot.time_slot)}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="font-semibold font-poppins text-gray-800">
                        {formatTimeToAmPm(slot.time_slot)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl">
        <div className="max-w-lg mx-auto p-4">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-lg py-6 font-poppins font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
            size="lg"
            onClick={handleContinue}
            disabled={!selectedDate || !selectedTime}
          >
            <div className="flex items-center justify-between w-full">
              <span>Continue to Payment</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuestDatetimePage;
