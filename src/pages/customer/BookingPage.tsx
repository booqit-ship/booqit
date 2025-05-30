import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, isWeekend, startOfDay } from 'date-fns';
import { formatTimeToAmPm, isToday, isTimeSlotInPast } from '@/utils/timeUtils';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_shop_holiday: boolean;
  is_stylist_holiday: boolean;
  shop_holiday_reason: string | null;
  stylist_holiday_reason: string | null;
}

const BookingPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff, selectedStaffDetails } = location.state;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);

  const getAvailableDates = () => {
    const dates: Date[] = [];
    let currentDate = new Date();
    let daysChecked = 0;
    const maxDaysToCheck = 30; // Check up to 30 days to find available dates
    
    while (dates.length < 3 && daysChecked < maxDaysToCheck) { // Show only 3 days
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Include all days that are not holidays (including weekends for some businesses)
      if (!holidays.includes(dateStr)) {
        dates.push(new Date(currentDate));
      }
      
      currentDate = addDays(currentDate, 1);
      daysChecked++;
    }
    
    return dates;
  };

  const availableDates = getAvailableDates();

  useEffect(() => {
    const fetchHolidayDates = async () => {
      try {
        if (!merchantId) return;

        const { data: shopHolidays } = await supabase
          .from('shop_holidays')
          .select('holiday_date')
          .eq('merchant_id', merchantId);

        const allHolidays = (shopHolidays || []).map(h => h.holiday_date);
        setHolidays(allHolidays);
      } catch (error) {
        console.error('Error fetching holiday data:', error);
      }
    };

    fetchHolidayDates();
  }, [merchantId]);

  // Convert time string to minutes for calculation
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes back to time string
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Check if a time slot conflicts with service duration
  const hasConflictWithDuration = (startTime: string, allSlots: AvailableSlot[], serviceDuration: number): boolean => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + serviceDuration;
    const bufferMinutes = 10; // 10 minute buffer between appointments
    
    // Check if there are any unavailable slots within the service duration + buffer
    const conflictingSlots = allSlots.filter(slot => {
      const slotMinutes = timeToMinutes(slot.time_slot);
      return slotMinutes >= startMinutes && slotMinutes < endMinutes + bufferMinutes;
    });
    
    // If we have fewer available slots than needed for the duration, there's a conflict
    const slotsNeeded = Math.ceil(serviceDuration / 10); // 10-minute slots
    const availableSlotsInRange = conflictingSlots.length;
    
    return availableSlotsInRange < slotsNeeded;
  };

  // Filter slots to ensure service duration can be accommodated
  const filterSlotsForServiceDuration = (slots: AvailableSlot[]): string[] => {
    const timeSlots = Array.from(new Set(slots.map(slot => slot.time_slot))).sort();
    const validStartTimes: string[] = [];
    
    for (const startTime of timeSlots) {
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = startMinutes + totalDuration;
      
      // Check if we have continuous availability for the service duration
      let canAccommodate = true;
      let currentMinutes = startMinutes;
      
      while (currentMinutes < endMinutes) {
        const currentTimeStr = minutesToTime(currentMinutes);
        const hasAvailableSlot = slots.some(slot => 
          slot.time_slot === currentTimeStr && 
          !slot.is_shop_holiday && 
          !slot.is_stylist_holiday
        );
        
        if (!hasAvailableSlot) {
          canAccommodate = false;
          break;
        }
        
        currentMinutes += 10; // Move to next 10-minute slot
      }
      
      if (canAccommodate) {
        validStartTimes.push(startTime);
      }
    }
    
    return validStartTimes;
  };

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !merchantId) return;

      setLoading(true);
      try {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        console.log('Fetching slots for date:', selectedDateStr, 'Is today:', isToday(selectedDateStr));

        // Generate slots for the selected date
        const { error: generateError } = await supabase.rpc('generate_stylist_slots', {
          p_merchant_id: merchantId,
          p_date: selectedDateStr
        });

        if (generateError) {
          console.error('Error generating slots:', generateError);
        }

        // Fetch available slots - this now properly filters blocked slots
        const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots', {
          p_merchant_id: merchantId,
          p_date: selectedDateStr,
          p_staff_id: selectedStaff || null,
          p_service_duration: totalDuration
        });

        if (slotsError) {
          console.error('Error fetching available slots:', slotsError);
          toast.error('Could not load available time slots');
          setAvailableSlots([]);
          return;
        }

        console.log('Available slots data from backend:', slotsData);

        // Process slots and filter out past times for today
        const processedSlots = (slotsData || [])
          .filter((slot: AvailableSlot) => {
            // Additional frontend filtering for past time slots
            if (isToday(selectedDateStr)) {
              const isPast = isTimeSlotInPast(slot.time_slot, selectedDateStr, 30);
              console.log(`Slot ${slot.time_slot} is past:`, isPast);
              return !isPast;
            }
            
            return true;
          })
          .map((slot: AvailableSlot) => ({
            ...slot,
            time_slot: slot.time_slot.substring(0, 5) // Ensure HH:MM format
          }));

        console.log('Processed slots after filtering:', processedSlots.length);
        setAvailableSlots(processedSlots);

      } catch (error) {
        console.error('Error fetching available slots:', error);
        toast.error('Could not load time slots');
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, merchantId, selectedStaff, totalDuration]);

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    const selectedSlot = availableSlots.find(slot => slot.time_slot === selectedTime);
    const finalStaffId = selectedStaff || selectedSlot?.staff_id;
    const finalStaffDetails = selectedStaffDetails || { name: selectedSlot?.staff_name };

    console.log('Navigating to payment with data:', {
      merchant,
      selectedServices,
      totalPrice,
      totalDuration,
      selectedStaff: finalStaffId,
      selectedStaffDetails: finalStaffDetails,
      bookingDate: format(selectedDate, 'yyyy-MM-dd'),
      bookingTime: selectedTime
    });

    navigate(`/payment/${merchantId}`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff: finalStaffId,
        selectedStaffDetails: finalStaffDetails,
        bookingDate: format(selectedDate, 'yyyy-MM-dd'),
        bookingTime: selectedTime
      }
    });
  };

  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
      return 'Tomorrow';
    } else {
      return format(date, 'EEE, MMM d');
    }
  };

  // Filter time slots to ensure service duration can be accommodated with proper buffering
  const validTimeSlots = filterSlotsForServiceDuration(availableSlots);

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
          <p className="text-gray-500 text-sm">Select your preferred date and time slot</p>
        </div>

        <div className="mb-6">
          <h3 className="font-medium mb-3 flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Select Date
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {availableDates.map((date) => {
              const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
              
              return (
                <Button
                  key={format(date, 'yyyy-MM-dd')}
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
                    {format(date, 'd')}
                  </div>
                  <div className="text-xs opacity-70">
                    {format(date, 'MMM')}
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
              Select Time
            </h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
              </div>
            ) : validTimeSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {validTimeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    className={`p-3 ${
                      selectedTime === time ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                    }`}
                    onClick={() => setSelectedTime(time)}
                  >
                    <span className="font-medium">{formatTimeToAmPm(time)}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No available time slots</p>
                <p className="text-gray-400 text-sm">Please select a different date</p>
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
          disabled={!selectedDate || !selectedTime}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default BookingPage;
