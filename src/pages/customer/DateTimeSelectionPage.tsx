import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { 
  formatDateInIST, 
  getCurrentDateIST, 
  isTodayIST, 
  isTimeSlotAvailableToday 
} from '@/utils/dateUtils';

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
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff, selectedStaffDetails } = location.state || {};

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Set today (IST) as default selected date
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, []);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !merchantId) return;

      setLoading(true);
      setSelectedTime(''); // Reset selected time when date changes
      
      try {
        // Format date in IST for backend consistency
        const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
        console.log('Fetching slots for date:', selectedDateStr, 'Staff:', selectedStaff, 'Duration:', totalDuration);

        // Get available slots using the updated IST-aware validation function
        const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_validation', {
          p_merchant_id: merchantId,
          p_date: selectedDateStr,
          p_staff_id: selectedStaff || null,
          p_service_duration: totalDuration || 30
        });

        if (slotsError) {
          console.error('Error fetching available slots:', slotsError);
          toast.error('Could not load available time slots');
          setAvailableSlots([]);
          return;
        }

        console.log('Raw slots data:', slotsData);

        const processedSlots = (slotsData || []).map((slot: any) => ({
          staff_id: slot.staff_id,
          staff_name: slot.staff_name,
          time_slot: typeof slot.time_slot === 'string' ? slot.time_slot.substring(0, 5) : formatDateInIST(new Date(`2000-01-01T${slot.time_slot}`), 'HH:mm'),
          is_available: slot.is_available,
          conflict_reason: slot.conflict_reason
        }));

        // Additional frontend filtering for today's slots (IST-aware)
        const filteredSlots = processedSlots.filter(slot => {
          // If it's today in IST, apply additional time filtering
          if (isTodayIST(selectedDate)) {
            return slot.is_available && isTimeSlotAvailableToday(slot.time_slot, 40);
          }
          // For future dates, rely on backend filtering
          return slot.is_available;
        });

        console.log('Processed and filtered slots:', filteredSlots);
        setAvailableSlots(processedSlots); // Keep all slots for display purposes

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

  const handleTimeSlotClick = (slot: AvailableSlot) => {
    if (!slot.is_available) {
      toast.error(slot.conflict_reason || 'This time slot is not available');
      return;
    }

    // Additional check for today's slots
    if (isTodayIST(selectedDate!) && !isTimeSlotAvailableToday(slot.time_slot, 40)) {
      toast.error('This time slot is too soon. Please select a slot at least 40 minutes from now.');
      return;
    }
    
    setSelectedTime(slot.time_slot);
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    const selectedSlot = availableSlots.find(slot => slot.time_slot === selectedTime && slot.is_available);
    if (!selectedSlot) {
      toast.error('Selected time slot is not available');
      return;
    }

    // Final check for today's slots
    if (isTodayIST(selectedDate) && !isTimeSlotAvailableToday(selectedTime, 40)) {
      toast.error('This time slot is too soon. Please select a slot at least 40 minutes from now.');
      return;
    }

    const finalStaffId = selectedStaff || selectedSlot?.staff_id;
    const finalStaffDetails = selectedStaffDetails || { name: selectedSlot?.staff_name };

    console.log('Navigating to payment with data:', {
      merchant,
      selectedServices,
      totalPrice,
      totalDuration,
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
        totalDuration,
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

  // Filter available and unavailable slots with IST consideration
  const availableTimeSlots = availableSlots.filter(slot => {
    if (!slot.is_available) return false;
    
    // Additional frontend filtering for today's slots
    if (isTodayIST(selectedDate!)) {
      return isTimeSlotAvailableToday(slot.time_slot, 40);
    }
    
    return true;
  });
  
  const unavailableTimeSlots = availableSlots.filter(slot => {
    if (!slot.is_available) return true;
    
    // Additional frontend filtering for today's slots
    if (isTodayIST(selectedDate!)) {
      return !isTimeSlotAvailableToday(slot.time_slot, 40);
    }
    
    return false;
  });

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
            Select your preferred date and time slot. Service duration: {totalDuration} minutes
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Booking available for today, tomorrow, and the day after only (IST - slots must be at least 40 minutes from now)
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
            </h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
              </div>
            ) : availableTimeSlots.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {Array.from(new Set(availableTimeSlots.map(slot => slot.time_slot))).map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      className={`p-3 ${
                        selectedTime === time ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                      }`}
                      onClick={() => {
                        const slot = availableTimeSlots.find(s => s.time_slot === time);
                        if (slot) handleTimeSlotClick(slot);
                      }}
                    >
                      <span className="font-medium">{formatTimeToAmPm(time)}</span>
                    </Button>
                  ))}
                </div>
                
                {unavailableTimeSlots.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Unavailable time slots:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from(new Set(unavailableTimeSlots.map(slot => slot.time_slot))).map((time) => {
                        const conflictSlot = unavailableTimeSlots.find(slot => slot.time_slot === time);
                        const isToday = isTodayIST(selectedDate);
                        const isTooSoon = isToday && !isTimeSlotAvailableToday(time, 40);
                        
                        return (
                          <Button
                            key={time}
                            variant="outline"
                            className="p-3 opacity-50 cursor-not-allowed bg-gray-100"
                            onClick={() => {
                              if (isTooSoon) {
                                toast.error('This time slot is too soon. Please select a slot at least 40 minutes from now.');
                              } else if (conflictSlot) {
                                handleTimeSlotClick(conflictSlot);
                              }
                            }}
                            disabled={false}
                          >
                            <span className="font-medium text-gray-500">{formatTimeToAmPm(time)}</span>
                          </Button>
                        );
                      })}
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
                    ? "All slots for today are either booked or too soon (need 40-min buffer)"
                    : "Please select a different date or try again later"
                  }
                </p>
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

export default DateTimeSelectionPage;
