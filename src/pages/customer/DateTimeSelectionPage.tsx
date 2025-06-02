
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
  isTodayIST,
  getCurrentTimeISTWithBuffer
} from '@/utils/dateUtils';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  slot_status: string;
  status_reason: string | null;
}

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff, selectedStaffDetails } = location.state || {};

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Calculate actual service duration from selected services
  const actualServiceDuration = selectedServices && selectedServices.length > 0 
    ? selectedServices.reduce((total: number, service: any) => total + service.duration, 0)
    : totalDuration || 30;

  // Generate 3 days: today, tomorrow, day after tomorrow (using IST)
  const getAvailableDates = () => {
    const dates: Date[] = [];
    const todayIST = getCurrentDateIST();
    
    for (let i = 0; i < 3; i++) {
      const date = addDays(todayIST, i);
      dates.push(date);
    }
    
    return dates;
  };

  const availableDates = getAvailableDates();

  // Filter slots for real-time updates (only for today)
  const filterSlotsForToday = (slots: AvailableSlot[], date: Date): AvailableSlot[] => {
    if (!isTodayIST(date)) {
      return slots.filter(slot => slot.slot_status === 'Available');
    }

    // Get current IST time with 40-minute buffer, rounded to next 10-minute mark
    const currentTimeWithBuffer = getCurrentTimeISTWithBuffer(40);
    
    return slots.filter(slot => {
      if (slot.slot_status !== 'Available') {
        return false;
      }
      
      // Compare time strings directly since they're in HH:MM format
      return slot.time_slot >= currentTimeWithBuffer;
    });
  };

  // Set today (IST) as default selected date
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, []);

  // Real-time slot filtering - runs every minute for today's slots
  useEffect(() => {
    if (!selectedDate || !isTodayIST(selectedDate) || availableSlots.length === 0) {
      setFilteredSlots(availableSlots.filter(slot => slot.slot_status === 'Available'));
      return;
    }

    const updateFilteredSlots = () => {
      console.log('Running real-time slot filtering for today...');
      const filtered = filterSlotsForToday(availableSlots, selectedDate);
      setFilteredSlots(filtered);
      
      // Clear selected time if it's no longer available
      if (selectedTime) {
        const isSelectedTimeStillAvailable = filtered.some(slot => slot.time_slot === selectedTime);
        if (!isSelectedTimeStillAvailable) {
          console.log('Selected time slot expired, clearing selection');
          setSelectedTime('');
          toast.info('Selected time slot is no longer available');
        }
      }
    };

    // Run immediately
    updateFilteredSlots();

    // Set up interval to run every minute (60000ms)
    const intervalId = setInterval(updateFilteredSlots, 60000);

    // Cleanup interval on unmount or dependency change
    return () => {
      clearInterval(intervalId);
    };
  }, [availableSlots, selectedDate, selectedTime]);

  // Fetch available slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !merchantId) return;

      setLoading(true);
      setError('');
      setSelectedTime(''); // Reset selected time when date changes
      
      try {
        const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
        console.log('Fetching slots for date:', selectedDateStr, 'Staff:', selectedStaff);

        // Use the fresh slot generation function
        const { data: slotsData, error: slotsError } = await supabase.rpc('get_fresh_available_slots', {
          p_merchant_id: merchantId,
          p_date: selectedDateStr,
          p_staff_id: selectedStaff || null
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
          slot_status: slot.slot_status,
          status_reason: slot.status_reason
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
  }, [selectedDate, merchantId, selectedStaff]);

  const handleTimeSlotClick = (timeSlot: string) => {
    // Find available slot for this time in filtered slots
    const availableSlot = filteredSlots.find(slot => 
      slot.time_slot === timeSlot && slot.slot_status === 'Available'
    );
    
    if (!availableSlot) {
      toast.error('This time slot is not available');
      return;
    }
    
    setSelectedTime(timeSlot);
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    const selectedSlot = filteredSlots.find(slot => 
      slot.time_slot === selectedTime && slot.slot_status === 'Available'
    );
    
    if (!selectedSlot) {
      toast.error('Selected time slot is not available');
      return;
    }

    const finalStaffId = selectedStaff || selectedSlot.staff_id;
    const finalStaffDetails = selectedStaffDetails || { name: selectedSlot.staff_name };

    console.log('Navigating to payment with data:', {
      merchant,
      selectedServices,
      totalPrice,
      totalDuration: actualServiceDuration,
      selectedStaff: finalStaffId,
      selectedStaffDetails: finalStaffDetails,
      bookingDate: formatDateInIST(selectedDate, 'yyyy-MM-dd'),
      bookingTime: selectedTime
    });

    navigate(`/payment/${merchantId}`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration: actualServiceDuration,
        selectedStaff: finalStaffId,
        selectedStaffDetails: finalStaffDetails,
        bookingDate: formatDateInIST(selectedDate, 'yyyy-MM-dd'),
        bookingTime: selectedTime
      }
    });
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

  // Get unique available time slots from filtered slots
  const availableTimeSlots = Array.from(new Set(
    filteredSlots.map(slot => slot.time_slot)
  )).sort();

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
            onClick={() => navigate(-1)}
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
              ? `Slots available from ${getCurrentTimeISTWithBuffer(40)} onwards (40-min buffer applied, auto-updated every minute)`
              : "All slots available during shop hours (9:00 AM - 9:00 PM IST)"
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
              Available Time Slots (IST) - 10 minute intervals
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
                    // Trigger refetch by updating selectedDate state
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
            ) : availableTimeSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableTimeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    className={`p-3 ${
                      selectedTime === time ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                    }`}
                    onClick={() => handleTimeSlotClick(time)}
                  >
                    <span className="font-medium">{formatTimeToAmPm(time)}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No available time slots</p>
                <p className="text-gray-400 text-sm">
                  {isTodayIST(selectedDate) 
                    ? "All slots for today are either booked or too soon (need 40-min buffer)"
                    : "Please select a different date or try again later"
                  }
                </p>
                {!loading && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => {
                      // Trigger refetch by updating selectedDate state
                      setSelectedDate(new Date(selectedDate));
                    }}
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
          disabled={!selectedDate || !selectedTime || loading}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
