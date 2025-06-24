
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, User, MapPin, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST, getCurrentDateIST, isTodayIST, addDays } from '@/utils/dateUtils';

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

  console.log('GUEST DATETIME: Page loaded with state:', {
    guestInfo: !!guestInfo,
    merchant: !!merchant,
    selectedServices: selectedServices?.length || 0,
    totalPrice,
    totalDuration,
    selectedStaff: selectedStaff || 'Any available',
    selectedStaffDetails: selectedStaffDetails?.name || 'Any available stylist'
  });

  // Generate next 3 days for date selection (same as regular customer flow)
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

  // Set today as default date
  useEffect(() => {
    if (availableDays.length > 0 && !selectedDate) {
      setSelectedDate(availableDays[0]);
    }
  }, [availableDays.length]);

  // Fetch available slots (same logic as regular customer)
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDate || !merchantId || !totalDuration) return;

    setIsLoading(true);
    setError('');
    
    try {
      const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      const isToday = isTodayIST(selectedDate);
      
      console.log('GUEST_DATETIME: Fetching slots for:', {
        date: selectedDateStr,
        isToday,
        totalDuration,
        selectedStaff: selectedStaff || 'any'
      });
      
      // Use the same slot function as regular customers
      const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: merchantId,
        p_date: selectedDateStr,
        p_staff_id: selectedStaff || null,
        p_service_duration: totalDuration
      });

      if (slotsError) {
        console.error('GUEST_DATETIME: Error fetching slots:', slotsError);
        setError('Unable to load time slots. Please try again.');
        setAvailableSlots([]);
        return;
      }

      const slots = Array.isArray(slotsData) ? slotsData : [];
      console.log('GUEST_DATETIME: Fetched slots:', slots.length);
      
      // Process slots with proper time formatting
      const processedSlots = slots.map((slot: any) => ({
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
      console.error('GUEST_DATETIME: Error fetching slots:', error);
      setError('Unable to load time slots. Please try again.');
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, merchantId, selectedStaff, totalDuration]);

  // Fetch slots when dependencies change
  useEffect(() => {
    fetchAvailableSlots();
    setSelectedTime(''); // Clear selected time when date changes
  }, [fetchAvailableSlots]);

  // Real-time updates (same as regular customer)
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
    console.log('GUEST_DATETIME: Date selected:', formatDateInIST(date, 'yyyy-MM-dd'));
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleTimeSelect = (timeSlot: string) => {
    console.log('GUEST_DATETIME: Time slot selected:', timeSlot);
    
    // Find if the slot is available
    const availableSlot = availableSlots.find(slot => 
      slot.time_slot === timeSlot && slot.is_available
    );
    
    if (!availableSlot) {
      toast.error('This time slot is not available');
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

    console.log('GUEST_DATETIME: Continuing to payment with:', {
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

  // Process available and unavailable slots
  const availableTimeSlots = availableSlots.filter(slot => slot.is_available);
  const unavailableSlots = availableSlots.filter(slot => !slot.is_available);
  
  const uniqueAvailableSlots = Array.from(new Map(
    availableTimeSlots.map(slot => [slot.time_slot, slot])
  ).values()).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  
  const uniqueUnavailableSlots = Array.from(new Map(
    unavailableSlots.map(slot => [slot.time_slot, slot])
  ).values()).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

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

  const isToday = selectedDate && isTodayIST(selectedDate);

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
            {availableDays.map((date) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString();

              return (
                <Card
                  key={date.toISOString()}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-booqit-primary bg-booqit-primary/5 shadow-md ring-2 ring-booqit-primary/20'
                      : 'border-gray-200 hover:border-booqit-primary/50'
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

        {/* Time Slots */}
        {selectedDate && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center font-righteous">
                <Clock className="h-4 w-4 mr-2" />
                Available Time Slots
              </h3>
              {isToday && (
                <div className="flex items-center text-sm text-gray-500">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span className="font-poppins">
                    Updated {formatDateInIST(lastRefreshTime, 'HH:mm')}
                  </span>
                </div>
              )}
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm font-poppins">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 font-poppins"
                  onClick={fetchAvailableSlots}
                >
                  Try Again
                </Button>
              </div>
            )}
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
              </div>
            ) : uniqueAvailableSlots.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {uniqueAvailableSlots.map((slot) => (
                    <Button
                      key={slot.time_slot}
                      variant={selectedTime === slot.time_slot ? "default" : "outline"}
                      className={`p-3 font-poppins ${
                        selectedTime === slot.time_slot ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                      }`}
                      onClick={() => handleTimeSelect(slot.time_slot)}
                    >
                      <span className="font-medium">{formatTimeToAmPm(slot.time_slot)}</span>
                    </Button>
                  ))}
                </div>
                
                {uniqueUnavailableSlots.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2 font-poppins">Unavailable slots:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {uniqueUnavailableSlots.slice(0, 5).map((slot) => (
                        <div
                          key={slot.time_slot}
                          className="p-2 bg-gray-100 rounded text-sm text-gray-600 border border-gray-200 font-poppins"
                        >
                          <span className="font-medium">{formatTimeToAmPm(slot.time_slot)}</span>
                          <span className="ml-2 text-xs">- {slot.conflict_reason || 'Unavailable'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 font-poppins">No available time slots</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 font-poppins"
                  onClick={fetchAvailableSlots}
                >
                  Refresh Slots
                </Button>
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
          disabled={!selectedDate || !selectedTime || isLoading}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default GuestDatetimePage;
