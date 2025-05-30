
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, CalendarIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { formatTimeToAmPm, isToday } from '@/utils/timeUtils';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason: string | null;
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
  const [conflictMessage, setConflictMessage] = useState<string>('');

  const getAvailableDates = () => {
    const dates: Date[] = [];
    let currentDate = new Date();
    let daysChecked = 0;
    const maxDaysToCheck = 30;
    
    while (dates.length < 3 && daysChecked < maxDaysToCheck) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
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

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !merchantId) return;

      setLoading(true);
      setConflictMessage('');
      try {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        console.log('Fetching slots for date:', selectedDateStr, 'Duration:', totalDuration);

        // Use the updated validation function that checks for time range conflicts
        const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_validation', {
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

        console.log('Available slots with validation:', slotsData);

        const processedSlots = (slotsData || []).map((slot: AvailableSlot) => ({
          ...slot,
          time_slot: slot.time_slot.substring(0, 5) // Ensure HH:MM format
        }));

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

  const handleTimeSlotClick = (slot: AvailableSlot) => {
    if (!slot.is_available) {
      setConflictMessage(slot.conflict_reason || 'This time slot is not available');
      setSelectedTime('');
      return;
    }
    
    setSelectedTime(slot.time_slot);
    setConflictMessage('');
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

  // Group slots by availability and get unique times
  const availableTimeSlots = Array.from(new Set(
    availableSlots.filter(slot => slot.is_available).map(slot => slot.time_slot)
  )).sort();

  const unavailableTimeSlots = availableSlots.filter(slot => !slot.is_available);

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
            
            {conflictMessage && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {conflictMessage}
                </AlertDescription>
              </Alert>
            )}
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
              </div>
            ) : availableTimeSlots.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {availableTimeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      className={`p-3 ${
                        selectedTime === time ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                      }`}
                      onClick={() => {
                        setSelectedTime(time);
                        setConflictMessage('');
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
                        return (
                          <Button
                            key={time}
                            variant="outline"
                            className="p-3 opacity-50 cursor-not-allowed bg-gray-100"
                            onClick={() => handleTimeSlotClick(conflictSlot!)}
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
