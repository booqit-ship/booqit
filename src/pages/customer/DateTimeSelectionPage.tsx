
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { 
  formatDateInIST, 
  getCurrentDateIST, 
  isTodayIST
} from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason: string | null;
}

interface BookingCreationResponse {
  success: boolean;
  booking_id?: string;
  error?: string;
  conflicting_slot?: string;
}

// Get current IST time using the exact method specified
const getCurrentISTTime = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
};

// Round IST time to the next 10-minute mark, then add 60-minute buffer
const getRoundedISTTimeWithBuffer = (): Date => {
  const nowIST = getCurrentISTTime();
  
  // Round up to next 10-minute mark
  const currentMinutes = nowIST.getMinutes();
  const roundedMinutes = Math.ceil(currentMinutes / 10) * 10;
  
  const roundedTime = new Date(nowIST);
  if (roundedMinutes >= 60) {
    roundedTime.setHours(nowIST.getHours() + 1);
    roundedTime.setMinutes(roundedMinutes - 60);
  } else {
    roundedTime.setMinutes(roundedMinutes);
  }
  roundedTime.setSeconds(0);
  roundedTime.setMilliseconds(0);
  
  // Add 60-minute buffer
  const bufferedTime = new Date(roundedTime.getTime() + 60 * 60 * 1000);
  
  console.log(`IST: ${nowIST.toLocaleTimeString()} → Rounded: ${roundedTime.toLocaleTimeString()} → With buffer: ${bufferedTime.toLocaleTimeString()}`);
  
  return bufferedTime;
};

// Check if a slot is valid (after the rounded time + 60-minute buffer)
const isSlotValid = (slotTimeString: string, bufferedIST: Date): boolean => {
  try {
    // Parse the time slot (assuming 24-hour format HH:MM)
    const [slotHour, slotMinPart] = slotTimeString.split(':');
    const hour = parseInt(slotHour);
    const minute = parseInt(slotMinPart) || 0;

    // Create slot date in IST
    const slotDate = new Date(bufferedIST);
    slotDate.setHours(hour);
    slotDate.setMinutes(minute);
    slotDate.setSeconds(0);
    slotDate.setMilliseconds(0);

    // Check if slot is after the buffered time
    const isValid = slotDate.getTime() >= bufferedIST.getTime();
    
    console.log(`Slot ${slotTimeString} (${hour}:${minute}) vs buffered IST ${bufferedIST.toLocaleTimeString()}: ${isValid}`);
    return isValid;
  } catch (error) {
    console.error('Error validating slot time:', error);
    return false;
  }
};

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff, selectedStaffDetails } = location.state || {};

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentBufferedIST, setCurrentBufferedIST] = useState<Date>(getRoundedISTTimeWithBuffer());
  const [holidays, setHolidays] = useState<string[]>([]);
  const [stylistHolidays, setStylistHolidays] = useState<string[]>([]);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  // Calculate actual service duration from selected services
  const actualServiceDuration = selectedServices && selectedServices.length > 0 
    ? selectedServices.reduce((total: number, service: any) => total + service.duration, 0)
    : totalDuration || 30;

  // Generate 3 days: today, tomorrow, day after tomorrow (using IST), excluding holidays
  const getAvailableDates = () => {
    const dates: Date[] = [];
    const todayIST = getCurrentDateIST();
    
    for (let i = 0; i < 3; i++) {
      const date = addDays(todayIST, i);
      const dateStr = formatDateInIST(date, 'yyyy-MM-dd');
      
      // Exclude shop holidays and stylist holidays
      if (!holidays.includes(dateStr) && !stylistHolidays.includes(dateStr)) {
        dates.push(date);
      }
    }
    
    return dates;
  };

  const availableDates = getAvailableDates();

  // Set today (IST) as default selected date
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates]);

  // Fetch holidays data
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!merchantId) return;

      try {
        // Fetch shop holidays
        const { data: shopHolidays } = await supabase
          .from('shop_holidays')
          .select('holiday_date')
          .eq('merchant_id', merchantId);

        const shopHolidayDates = (shopHolidays || []).map(h => h.holiday_date);
        setHolidays(shopHolidayDates);

        // Fetch stylist holidays if specific staff is selected
        if (selectedStaff) {
          const { data: staffHolidays } = await supabase
            .from('stylist_holidays')
            .select('holiday_date')
            .eq('staff_id', selectedStaff);

          const staffHolidayDates = (staffHolidays || []).map(h => h.holiday_date);
          setStylistHolidays(staffHolidayDates);
        }

      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    };

    fetchHolidays();
  }, [merchantId, selectedStaff]);

  // Update buffered IST time every minute for real-time filtering
  useEffect(() => {
    const updateBufferedTime = () => {
      const newBufferedIST = getRoundedISTTimeWithBuffer();
      setCurrentBufferedIST(newBufferedIST);
      console.log('Updated buffered IST time:', newBufferedIST.toLocaleTimeString());
    };

    // Update immediately
    updateBufferedTime();

    // Set up interval to update every minute
    const intervalId = setInterval(updateBufferedTime, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Cleanup function for pending booking
  const cleanupPendingBooking = async () => {
    if (pendingBookingId) {
      console.log('Cleaning up pending booking:', pendingBookingId);
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', pendingBookingId);
        
        if (error) {
          console.error('Error cleaning up pending booking:', error);
        } else {
          console.log('Pending booking cleaned up successfully');
        }
      } catch (error) {
        console.error('Error in cleanup:', error);
      }
      setPendingBookingId(null);
    }
  };

  // Handle page unload/navigation away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingBookingId) {
        // Use sendBeacon for cleanup on page unload
        const url = 'https://ggclvurfcykbwmhfftkn.supabase.co/rest/v1/bookings?id=eq.' + pendingBookingId;
        const data = JSON.stringify({ status: 'cancelled' });
        const headers = {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnY2x2dXJmY3lrYndtaGZmdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ3OTUsImV4cCI6MjA2MzI5MDc5NX0.0lpqHKUCWh47YTnRuksWDmv6Y5JPEanMwVyoQy9zeHw'
        };
        
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    };

    const handlePopState = () => {
      cleanupPendingBooking();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pendingBookingId]);

  // Fetch available slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !merchantId) return;

      setLoading(true);
      setError('');
      setSelectedTime(''); // Reset selected time when date changes
      
      try {
        const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
        console.log('Fetching slots for date:', selectedDateStr, 'Staff:', selectedStaff, 'Service duration:', actualServiceDuration);

        // Use the fixed validation function
        const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_validation', {
          p_merchant_id: merchantId,
          p_date: selectedDateStr,
          p_staff_id: selectedStaff || null,
          p_service_duration: actualServiceDuration
        });

        if (slotsError) {
          console.error('Error fetching available slots:', slotsError);
          setError('Could not load available time slots. Please try again.');
          setAvailableSlots([]);
          return;
        }

        console.log('Raw slots data:', slotsData);

        if (!slotsData || slotsData.length === 0) {
          console.log('No slots returned from database');
          setAvailableSlots([]);
          return;
        }

        // Process the slots data
        const processedSlots = slotsData.map((slot: any) => ({
          staff_id: slot.staff_id,
          staff_name: slot.staff_name,
          time_slot: typeof slot.time_slot === 'string' ? slot.time_slot.substring(0, 5) : formatDateInIST(new Date(`2000-01-01T${slot.time_slot}`), 'HH:mm'),
          is_available: slot.is_available,
          conflict_reason: slot.conflict_reason
        }));

        console.log('Processed slots:', processedSlots);
        setAvailableSlots(processedSlots);

      } catch (error) {
        console.error('Error fetching available slots:', error);
        setError('Could not load time slots. Please try again.');
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, merchantId, selectedStaff, actualServiceDuration]);

  const handleTimeSlotClick = async (timeSlot: string) => {
    if (!selectedDate || !merchantId) return;
    
    // Find available slot for this time
    const availableSlot = availableSlots.find(slot => 
      slot.time_slot === timeSlot && slot.is_available
    );
    
    if (!availableSlot) {
      toast.error('This time slot is not available');
      return;
    }

    // For today's bookings, double-check the time is still valid with current buffered IST time
    if (isTodayIST(selectedDate)) {
      if (!isSlotValid(timeSlot, getRoundedISTTimeWithBuffer())) {
        toast.error('This time slot is too soon. Please select a later time.');
        return;
      }
    }

    setSelectedTime(timeSlot);
    console.log('Time slot selected successfully:', timeSlot);
  };

  const handleContinue = async () => {
    if (!selectedDate || !selectedTime || !userId) {
      toast.error('Please select both date and time');
      return;
    }

    const selectedSlot = availableSlots.find(slot => 
      slot.time_slot === selectedTime && slot.is_available
    );
    
    if (!selectedSlot) {
      toast.error('Selected time slot is not available');
      return;
    }

    // For today's bookings, final time check with current buffered IST time
    if (isTodayIST(selectedDate)) {
      if (!isSlotValid(selectedTime, getRoundedISTTimeWithBuffer())) {
        toast.error('Selected time slot is too soon. Please select another time.');
        setSelectedTime('');
        return;
      }
    }

    setIsCreatingBooking(true);

    try {
      const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      const finalStaffId = selectedStaff || selectedSlot.staff_id;
      const serviceId = selectedServices[0]?.id;

      if (!serviceId) {
        toast.error('Service information is missing');
        return;
      }

      console.log('Creating confirmed booking with data:', {
        userId,
        merchantId,
        serviceId,
        finalStaffId,
        selectedDateStr,
        selectedTime,
        actualServiceDuration
      });

      // Create booking immediately with confirmed status using atomic function
      const { data: bookingResult, error: bookingError } = await supabase.rpc('create_confirmed_booking', {
        p_user_id: userId,
        p_merchant_id: merchantId,
        p_service_id: serviceId,
        p_staff_id: finalStaffId,
        p_date: selectedDateStr,
        p_time_slot: selectedTime,
        p_service_duration: actualServiceDuration
      });

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        
        if (bookingError.message.includes('overlaps') || bookingError.message.includes('booked')) {
          toast.error('This time slot is no longer available. Please select another time.');
          // Refresh slots to show updated availability
          setSelectedDate(new Date(selectedDate));
          setSelectedTime('');
        } else {
          toast.error(`Failed to create booking: ${bookingError.message}`);
        }
        return;
      }

      const response = bookingResult as unknown as BookingCreationResponse;
      
      if (!response.success) {
        const errorMessage = response.error || 'Time slot is no longer available';
        toast.error(errorMessage);
        
        if (errorMessage.includes('overlaps') || errorMessage.includes('available')) {
          // Refresh slots to show updated availability
          setSelectedDate(new Date(selectedDate));
          setSelectedTime('');
        }
        return;
      }

      const bookingId = response.booking_id;
      setPendingBookingId(bookingId);

      console.log('Booking created successfully:', bookingId);
      toast.success('Slot reserved! Proceeding to payment...');

      const finalStaffDetails = selectedStaffDetails || { name: selectedSlot.staff_name };

      // Navigate to payment page with booking ID
      navigate(`/payment/${merchantId}`, {
        state: {
          merchant,
          selectedServices,
          totalPrice,
          totalDuration: actualServiceDuration,
          selectedStaff: finalStaffId,
          selectedStaffDetails: finalStaffDetails,
          bookingDate: selectedDateStr,
          bookingTime: selectedTime,
          bookingId: bookingId
        }
      });

    } catch (error) {
      console.error('Error in booking creation:', error);
      toast.error('Error creating booking. Please try again.');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const formatDateDisplay = (date: Date) => {
    const todayIST = getCurrentDateIST();
    const tomorrowIST = addDays(todayIST, 1);
    const dayAfterTomorrowIST = addDays(todayIST, 2);
    
    if (formatDateInIST(date, 'yyyy-MM-dd') === formatDateInIST(todayIST, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (formatDateInIST(date, 'yyyy-MM-dd') === formatDateInIST(tomorrowIST, 'yyyy-MM-dd')) {
      return 'Tomorrow';
    } else if (formatDateInIST(date, 'yyyy-MM-dd') === formatDateInIST(dayAfterTomorrowIST, 'yyyy-MM-dd')) {
      return formatDateInIST(date, 'EEE, MMM d');
    } else {
      return formatDateInIST(date, 'EEE, MMM d');
    }
  };

  // Get available and unavailable slots
  const availableTimeSlots = availableSlots.filter(slot => slot.is_available);
  const unavailableSlots = availableSlots.filter(slot => !slot.is_available);
  
  // For today, also filter out slots that are too soon
  const filteredAvailableSlots = isTodayIST(selectedDate || getCurrentDateIST()) 
    ? availableTimeSlots.filter(slot => isSlotValid(slot.time_slot, currentBufferedIST))
    : availableTimeSlots;
  
  const uniqueAvailableSlots = Array.from(new Map(
    filteredAvailableSlots.map(slot => [slot.time_slot, slot])
  ).values()).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const uniqueUnavailableSlots = Array.from(new Map(
    unavailableSlots.map(slot => [slot.time_slot, slot])
  ).values()).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  if (!merchant) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Merchant information missing</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-white min-h-screen">
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-0 text-white hover:bg-white/20"
            onClick={() => {
              cleanupPendingBooking();
              navigate(-1);
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">Select Date & Time</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Choose Your Appointment</h2>
          <p className="text-gray-500 text-sm">
            Select your preferred date and time slot. Service duration: {actualServiceDuration} minutes
            {selectedServices && selectedServices.length > 1 && (
              <span className="block text-xs text-gray-400 mt-1">
                Combined duration from {selectedServices.length} services
              </span>
            )}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {isTodayIST(selectedDate || getCurrentDateIST()) 
              ? `Slots available from ${currentBufferedIST.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: true })} (rounded + 1hr buffer)`
              : "All slots available during shop hours (excluding holidays)"
            }
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-medium mb-3 flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Select Date
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {availableDates.map((date) => {
              const isSelected = selectedDate && formatDateInIST(selectedDate, 'yyyy-MM-dd') === formatDateInIST(date, 'yyyy-MM-dd');
              
              return (
                <Button
                  key={formatDateInIST(date, 'yyyy-MM-dd')}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-auto p-3 flex flex-col items-center space-y-1 ${
                    isSelected ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                  }`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="text-xs font-medium">
                    {formatDateDisplay(date)}
                  </div>
                  <div className="text-lg font-bold">
                    {formatDateInIST(date, 'd')}
                  </div>
                  <div className="text-xs opacity-70">
                    {formatDateInIST(date, 'MMM')}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div className="mb-6">
            <h3 className="font-medium mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Available Time Slots (IST)
              {isTodayIST(selectedDate) && (
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Live Updates
                </span>
              )}
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    setError('');
                    setSelectedDate(new Date(selectedDate));
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}
            
            {loading ? (
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
                      className={`p-3 ${
                        selectedTime === slot.time_slot ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                      }`}
                      onClick={() => handleTimeSlotClick(slot.time_slot)}
                    >
                      <span className="font-medium">{formatTimeToAmPm(slot.time_slot)}</span>
                    </Button>
                  ))}
                </div>
                
                {uniqueUnavailableSlots.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Unavailable slots:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {uniqueUnavailableSlots.slice(0, 5).map((slot) => (
                        <div
                          key={slot.time_slot}
                          className="p-2 bg-gray-100 rounded text-sm text-gray-600 border border-gray-200"
                        >
                          <span className="font-medium">{formatTimeToAmPm(slot.time_slot)}</span>
                          <span className="ml-2 text-xs">- {slot.conflict_reason || 'Unavailable'}</span>
                        </div>
                      ))}
                      {uniqueUnavailableSlots.length > 5 && (
                        <p className="text-xs text-gray-500 mt-1">
                          +{uniqueUnavailableSlots.length - 5} more unavailable slots
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No available time slots</p>
                <p className="text-gray-400 text-sm">
                  {isTodayIST(selectedDate) 
                    ? "All slots for today are either booked or too soon (rounded time + 1hr buffer required in IST)"
                    : "Please select a different date or try again later"
                  }
                </p>
                {!loading && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setSelectedDate(new Date(selectedDate))}
                  >
                    Refresh Slots
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime || loading || isCreatingBooking}
        >
          {isCreatingBooking ? 'Reserving Slot...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
