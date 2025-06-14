import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, CalendarIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { 
  formatDateInIST, 
  getCurrentDateIST, 
  getCurrentTimeIST,
  getCurrentTimeISTWithBuffer,
  isTodayIST
} from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason: string | null;
}

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
  const [holidays, setHolidays] = useState<string[]>([]);
  const [stylistHolidays, setStylistHolidays] = useState<string[]>([]);
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [nextValidSlotTime, setNextValidSlotTime] = useState<string>('');

  console.log('MULTIPLE_SERVICES_DATETIME: Using total duration:', totalDuration, 'minutes for slot checking');

  // Generate available dates (3 days, excluding holidays)
  const getAvailableDates = () => {
    const dates: Date[] = [];
    const todayIST = getCurrentDateIST();
    
    for (let i = 0; i < 3; i++) {
      const date = addDays(todayIST, i);
      const dateStr = formatDateInIST(date, 'yyyy-MM-dd');
      
      if (!holidays.includes(dateStr) && !stylistHolidays.includes(dateStr)) {
        dates.push(date);
      }
    }
    return dates;
  };

  const availableDates = getAvailableDates();

  // Set today as default
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates]);

  // Fetch holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!merchantId) return;

      try {
        const { data: shopHolidays } = await supabase
          .from('shop_holidays')
          .select('holiday_date')
          .eq('merchant_id', merchantId);

        const shopHolidayDates = (shopHolidays || []).map(h => h.holiday_date);
        setHolidays(shopHolidayDates);

        let staffHolidayDates: string[] = [];
        if (selectedStaff) {
          const { data: staffHolidays } = await supabase
            .from('stylist_holidays')
            .select('holiday_date')
            .eq('staff_id', selectedStaff);

          staffHolidayDates = (staffHolidays || []).map(h => h.holiday_date);
        }
        setStylistHolidays(staffHolidayDates);

      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    };

    fetchHolidays();
  }, [merchantId, selectedStaff]);

  // Fetch available slots using total duration
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDate || !merchantId || !totalDuration) return;

    setLoading(true);
    setError('');
    
    try {
      const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      const isToday = isTodayIST(selectedDate);
      
      console.log('=== FETCHING SLOTS FOR MULTIPLE SERVICES ===');
      console.log('Date:', selectedDateStr, '| Is today:', isToday);
      console.log('Total duration for all services:', totalDuration, 'minutes');
      console.log('Services:', selectedServices?.map(s => `${s.name} (${s.duration}min)`));
      if (isToday) {
        console.log('Current IST:', getCurrentTimeIST());
        console.log('Expected start after buffer:', getCurrentTimeISTWithBuffer(40));
      }
      
      // Use total duration for slot availability checking
      const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: merchantId,
        p_date: selectedDateStr,
        p_staff_id: selectedStaff || null,
        p_service_duration: totalDuration  // Use total duration, not individual service
      });

      if (slotsError) {
        console.error('Error from slot function:', slotsError);
        setError('Unable to load time slots. Please try again.');
        setAvailableSlots([]);
        return;
      }

      const slots = Array.isArray(slotsData) ? slotsData : [];
      console.log('Backend returned', slots.length, 'total slots for', totalDuration, 'minute total duration');
      
      // Additional frontend filtering for today to ensure no expired slots
      let filteredSlots = slots;
      if (isToday) {
        const currentBufferTime = getCurrentTimeISTWithBuffer(40);
        filteredSlots = slots.filter(slot => {
          const slotTime = typeof slot.time_slot === 'string' 
            ? slot.time_slot.substring(0, 5) 
            : formatDateInIST(new Date(`2000-01-01T${slot.time_slot}`), 'HH:mm');
          return slotTime >= currentBufferTime;
        });
        console.log('After frontend filtering:', filteredSlots.length, 'slots remain');
      }
      
      console.log('Available slots for total duration', totalDuration, 'minutes:', filteredSlots.filter(s => s.is_available).length);
      
      if (filteredSlots.length === 0) {
        const errorMsg = isToday 
          ? `No slots available today after ${getCurrentTimeISTWithBuffer(40)} for ${totalDuration} minutes` 
          : `No slots available for this date for ${totalDuration} minutes duration`;
        setError(errorMsg);
        setAvailableSlots([]);
        return;
      }

      // Process slots with improved time formatting
      const processedSlots = filteredSlots.map((slot: any) => ({
        staff_id: slot.staff_id,
        staff_name: slot.staff_name,
        time_slot: typeof slot.time_slot === 'string' 
          ? slot.time_slot.substring(0, 5) 
          : formatDateInIST(new Date(`2000-01-01T${slot.time_slot}`), 'HH:mm'),
        is_available: slot.is_available,
        conflict_reason: slot.conflict_reason
      }));
      
      // Find next valid slot for today
      if (isToday) {
        const availableSlots = processedSlots.filter(s => s.is_available);
        if (availableSlots.length > 0) {
          setNextValidSlotTime(availableSlots[0].time_slot);
        } else {
          setNextValidSlotTime('');
        }
      } else {
        setNextValidSlotTime('');
      }
      
      console.log('Final processed slots:', processedSlots.length);
      console.log('=== END SLOT FETCH ===');
      
      setAvailableSlots(processedSlots);
      setLastRefreshTime(new Date());

    } catch (error) {
      console.error('Error fetching slots:', error);
      setError('Unable to load time slots. Please try again.');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, merchantId, selectedStaff, totalDuration, selectedServices]);

  // Initial fetch and setup periodic refresh for today's slots
  useEffect(() => {
    fetchAvailableSlots();
    setSelectedTime('');

    // Set up periodic refresh for today's slots (every minute)
    const isToday = selectedDate && isTodayIST(selectedDate);
    if (isToday) {
      const interval = setInterval(() => {
        console.log('Auto-refreshing today slots to update buffer time');
        fetchAvailableSlots();
      }, 60000); // Refresh every minute

      return () => clearInterval(interval);
    }
  }, [fetchAvailableSlots]);

  // Set up real-time subscriptions
  useRealtimeSlots({
    selectedDate,
    selectedStaff,
    merchantId: merchantId || '',
    onSlotChange: fetchAvailableSlots,
    selectedTime,
    onSelectedTimeInvalidated: () => {
      setSelectedTime('');
    }
  });

  // Handle slot selection - uses total duration for validation
  const handleTimeSlotClick = async (timeSlot: string) => {
    if (!selectedDate || !merchantId || !userId) return;
    
    // Double-check if slot is still valid for today
    if (isTodayIST(selectedDate)) {
      const currentBufferTime = getCurrentTimeISTWithBuffer(40);
      if (timeSlot < currentBufferTime) {
        toast.error('This time slot is no longer available due to time passing');
        fetchAvailableSlots();
        return;
      }
    }
    
    // Find if the slot is available for total duration
    const availableSlot = availableSlots.find(slot => 
      slot.time_slot === timeSlot && slot.is_available
    );
    
    if (!availableSlot) {
      toast.error(`This time slot is not available for ${totalDuration} minutes total duration`);
      return;
    }

    setIsCheckingSlot(true);

    try {
      console.log('MULTIPLE_SERVICES_SLOT_SELECTION: Selected slot:', {
        timeSlot,
        totalDuration,
        services: selectedServices?.length || 0,
        serviceDetails: selectedServices?.map(s => ({ name: s.name, duration: s.duration }))
      });
      
      setSelectedTime(timeSlot);
      toast.success(`Time slot selected for ${totalDuration} minutes total duration!`);
    } catch (error) {
      console.error('Error selecting slot:', error);
      toast.error('Error selecting time slot. Please try again.');
    } finally {
      setIsCheckingSlot(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedDate || !selectedTime || !userId) {
      toast.error('Please select a time slot first');
      return;
    }

    const selectedSlot = availableSlots.find(slot => 
      slot.time_slot === selectedTime
    );
    
    if (!selectedSlot) {
      toast.error('Selected time slot information not found');
      return;
    }

    try {
      const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      const finalStaffId = selectedStaff || selectedSlot.staff_id;
      const finalStaffDetails = selectedStaffDetails || { name: selectedSlot.staff_name };

      console.log('MULTIPLE_SERVICES_CONTINUE: Proceeding to payment with:', {
        totalDuration,
        totalPrice,
        servicesCount: selectedServices?.length,
        selectedTime: selectedTime
      });

      // Navigate to payment with multiple services data
      navigate(`/payment/${merchantId}`, {
        state: {
          merchant,
          selectedServices,
          totalPrice,
          totalDuration,
          selectedStaff: finalStaffId,
          selectedStaffDetails: finalStaffDetails,
          bookingDate: selectedDateStr,
          bookingTime: selectedTime
        }
      });

    } catch (error) {
      console.error('Error proceeding to payment:', error);
      toast.error('Error proceeding to payment. Please try again.');
    }
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
  const unavailableSlots = availableSlots.filter(slot => !slot.is_available);
  
  const uniqueAvailableSlots = Array.from(new Map(
    availableTimeSlots.map(slot => [slot.time_slot, slot])
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

  const isToday = selectedDate && isTodayIST(selectedDate);

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
          <h1 className="text-xl font-medium font-righteous">Select Date & Time</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 font-righteous">Choose Your Appointment</h2>
          <p className="text-gray-500 text-sm font-poppins">
            Select your preferred date and time slot. Total duration: {totalDuration} minutes
          </p>
          {selectedServices && selectedServices.length > 1 && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-700 text-sm font-poppins">
                Multiple services selected: {selectedServices.map(s => s.name).join(', ')}
              </p>
            </div>
          )}
          {isToday && nextValidSlotTime && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 text-sm font-poppins">
                Next available slot: {formatTimeToAmPm(nextValidSlotTime)}
              </p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="font-medium mb-3 flex items-center font-righteous">
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
                  className={`h-auto p-3 flex flex-col items-center space-y-1 font-poppins ${
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
                      className={`p-3 font-poppins ${
                        selectedTime === slot.time_slot ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                      }`}
                      onClick={() => handleTimeSlotClick(slot.time_slot)}
                      disabled={isCheckingSlot}
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
                          <span className="ml-2 text-xs">- {slot.conflict_reason || 'Unavailable for total duration'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 font-poppins">No available time slots for {totalDuration} minutes</p>
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime || loading || isCheckingSlot}
        >
          {isCheckingSlot ? 'Checking Availability...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
