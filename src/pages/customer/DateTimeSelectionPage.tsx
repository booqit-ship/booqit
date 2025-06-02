
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
  getCurrentTimeISTWithBuffer
} from '@/utils/dateUtils';
import {
  AvailableSlot,
  calculateTotalServiceDuration,
  filterSlotsForToday,
  groupSlotsByAvailability,
  getUniqueTimeSlots,
  getBestStaffForTimeSlot,
  validateTimeSlotSelection
} from '@/utils/slotUtils';

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff, selectedStaffDetails } = location.state || {};

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // Calculate actual service duration from selected services
  const actualServiceDuration = selectedServices && selectedServices.length > 0 
    ? calculateTotalServiceDuration(selectedServices)
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
        const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
        console.log('Fetching slots for date:', selectedDateStr, 'Staff:', selectedStaff, 'Duration:', actualServiceDuration);

        // Get available slots using the updated IST-aware validation function
        const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_validation', {
          p_merchant_id: merchantId,
          p_date: selectedDateStr,
          p_staff_id: selectedStaff || null,
          p_service_duration: actualServiceDuration
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

        // Apply IST-aware filtering for today's slots
        const filteredSlots = filterSlotsForToday(processedSlots, selectedDate, 40);

        console.log('Processed and filtered slots:', filteredSlots);
        setAvailableSlots(filteredSlots);

      } catch (error) {
        console.error('Error fetching available slots:', error);
        toast.error('Could not load time slots');
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, merchantId, selectedStaff, actualServiceDuration]);

  const handleTimeSlotClick = (timeSlot: string) => {
    const validation = validateTimeSlotSelection(timeSlot, selectedDate!, availableSlots, 40);
    
    if (!validation.isValid) {
      toast.error(validation.reason || 'This time slot is not available');
      return;
    }

    const bestStaff = getBestStaffForTimeSlot(availableSlots, timeSlot);
    if (!bestStaff) {
      toast.error('No staff available for this time slot');
      return;
    }
    
    setSelectedTime(timeSlot);
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    const validation = validateTimeSlotSelection(selectedTime, selectedDate, availableSlots, 40);
    if (!validation.isValid) {
      toast.error(validation.reason || 'Selected time slot is not available');
      return;
    }

    const selectedSlot = getBestStaffForTimeSlot(availableSlots, selectedTime);
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

  // Group slots by availability with IST consideration
  const { available: availableTimeSlots, unavailable: unavailableTimeSlots } = groupSlotsByAvailability(availableSlots);
  
  // Get unique time slots for display
  const availableUniqueSlots = getUniqueTimeSlots(availableTimeSlots);
  const unavailableUniqueSlots = getUniqueTimeSlots(unavailableTimeSlots);

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
              ? `Slots available from ${getCurrentTimeISTWithBuffer(40)} onwards (40-min buffer applied)`
              : "All slots available during shop hours"
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
            </h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
              </div>
            ) : availableUniqueSlots.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {availableUniqueSlots.map((time) => (
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
                
                {unavailableUniqueSlots.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Unavailable time slots:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {unavailableUniqueSlots.map((time) => (
                        <Button
                          key={time}
                          variant="outline"
                          className="p-3 opacity-50 cursor-not-allowed bg-gray-100"
                          onClick={() => {
                            const unavailableSlot = unavailableTimeSlots.find(slot => slot.time_slot === time);
                            if (unavailableSlot?.conflict_reason) {
                              toast.error(unavailableSlot.conflict_reason);
                            }
                          }}
                          disabled={false}
                        >
                          <span className="font-medium text-gray-500">{formatTimeToAmPm(time)}</span>
                        </Button>
                      ))}
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
