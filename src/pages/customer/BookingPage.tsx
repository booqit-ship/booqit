
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format, addDays, startOfToday } from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DateOption {
  date: Date;
  label: string;
  day: string;
}

const BookingPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff } = location.state;

  const [loading, setLoading] = useState(false);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Generate available dates (today + next 6 days)
  useEffect(() => {
    const today = startOfToday();
    const dates: DateOption[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const day = format(date, 'EEE').toUpperCase();
      const label = format(date, 'MMM d');
      
      dates.push({
        date,
        day,
        label
      });
    }
    
    setAvailableDates(dates);
  }, []);

  // Generate time slots when date changes
  useEffect(() => {
    if (merchant && availableDates.length > 0) {
      const selectedDate = availableDates[selectedDateIndex]?.date;
      if (selectedDate) {
        generateTimeSlots(merchant.open_time, merchant.close_time, totalDuration, selectedDate);
      }
    }
  }, [selectedDateIndex, merchant, availableDates, totalDuration]);

  const generateTimeSlots = async (openTime: string, closeTime: string, duration: number, date: Date) => {
    const slots: TimeSlot[] = [];
    
    try {
      const openMinutes = convertTimeToMinutes(openTime);
      const closeMinutes = convertTimeToMinutes(closeTime);
      
      let currentMinute = openMinutes;
      while (currentMinute + duration <= closeMinutes) {
        const hour = Math.floor(currentMinute / 60);
        const minute = currentMinute % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        slots.push({ 
          time: timeString, 
          available: true
        });
        
        currentMinute += 30; 
      }

      const dateString = format(date, 'yyyy-MM-dd');
      await checkSlotAvailability(slots, dateString);
      
      setSelectedTimeSlot(null);
    } catch (error) {
      console.error('Error generating time slots:', error);
      toast.error('Could not generate time slots');
    }
  };

  const checkSlotAvailability = async (slots: TimeSlot[], dateString: string) => {
    try {
      // Check existing bookings
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('time_slot, staff_id')
        .eq('merchant_id', merchantId)
        .eq('date', dateString)
        .neq('status', 'cancelled');

      if (bookingError) throw bookingError;

      // Check merchant holidays
      const { data: holidays, error: holidayError } = await supabase
        .from('shop_holidays')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('holiday_date', dateString);

      if (holidayError) throw holidayError;

      // Check staff holidays and blocked slots if specific staff is selected
      let staffHolidays: any[] = [];
      let blockedSlots: any[] = [];

      if (selectedStaff) {
        const { data: staffHolidayData, error: staffHolidayError } = await supabase
          .from('stylist_holidays')
          .select('*')
          .eq('staff_id', selectedStaff)
          .eq('holiday_date', dateString);

        if (staffHolidayError) throw staffHolidayError;
        staffHolidays = staffHolidayData || [];

        const { data: blockedSlotData, error: blockedSlotError } = await supabase
          .from('stylist_blocked_slots')
          .select('*')
          .eq('staff_id', selectedStaff)
          .eq('blocked_date', dateString);

        if (blockedSlotError) throw blockedSlotError;
        blockedSlots = blockedSlotData || [];
      }

      // Mark slots as unavailable based on various conditions
      const updatedSlots = slots.map(slot => {
        const slotStartMinutes = convertTimeToMinutes(slot.time);
        const slotEndMinutes = slotStartMinutes + totalDuration;

        // Check if merchant is closed (holiday)
        if (holidays && holidays.length > 0) {
          return { ...slot, available: false };
        }

        // Check if selected staff has holiday
        if (staffHolidays.length > 0) {
          return { ...slot, available: false };
        }

        // Check if slot is blocked for selected staff
        const isBlocked = blockedSlots.some(blocked => 
          convertTimeToMinutes(blocked.time_slot) === slotStartMinutes
        );
        if (isBlocked) {
          return { ...slot, available: false };
        }

        // Check if slot overlaps with existing bookings
        const hasConflict = bookings?.some(booking => {
          const bookingStartMinutes = convertTimeToMinutes(booking.time_slot);
          const bookingEndMinutes = bookingStartMinutes + 60; // Assume 60 min default

          if (selectedStaff && booking.staff_id === selectedStaff) {
            return (
              (slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes) ||
              (bookingStartMinutes < slotEndMinutes && bookingEndMinutes > slotStartMinutes)
            );
          }

          return false;
        });

        return { ...slot, available: !hasConflict };
      });

      setTimeSlots(updatedSlots);
    } catch (error) {
      console.error('Error checking slot availability:', error);
      setTimeSlots(slots);
    }
  };

  const convertTimeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleDateSelection = (index: number) => {
    setSelectedDateIndex(index);
  };

  const handleContinue = () => {
    if (!availableDates[selectedDateIndex]) {
      toast.error('Please select a date');
      return;
    }
    
    if (!selectedTimeSlot) {
      toast.error('Please select a time slot');
      return;
    }

    navigate(`/booking/${merchantId}/summary`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff,
        bookingDate: format(availableDates[selectedDateIndex].date, 'yyyy-MM-dd'),
        bookingTime: selectedTimeSlot
      }
    });
  };

  if (!merchant || !selectedServices) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Booking information missing</p>
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
          <h1 className="text-xl font-medium">Date and Time</h1>
        </div>
      </div>
      
      <div className="p-4 space-y-8">
        {/* Date Selection */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Date</h2>
          <div className="grid grid-cols-4 gap-2 overflow-x-auto">
            {availableDates.map((dateOption, index) => (
              <div key={index} className="flex-shrink-0">
                <button
                  onClick={() => handleDateSelection(index)}
                  className={cn(
                    "w-full rounded-lg p-3 border transition-all duration-200",
                    selectedDateIndex === index
                      ? "border-booqit-primary bg-booqit-primary text-white"
                      : "border-gray-200 hover:border-booqit-primary/50"
                  )}
                >
                  <div className="text-center">
                    <div className="font-medium">{dateOption.day}</div>
                    <div className={`${selectedDateIndex === index ? 'text-white' : 'text-gray-500'} text-sm`}>
                      {dateOption.label}
                    </div>
                    <div className={`${selectedDateIndex === index ? 'text-white' : 'text-gray-500'} text-xs mt-1`}>
                      {totalDuration} mins
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Time Slots */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Time</h2>
          {timeSlots.length > 0 ? (
            <RadioGroup
              value={selectedTimeSlot || ''}
              onValueChange={setSelectedTimeSlot}
              className="space-y-2"
            >
              {timeSlots.map((slot) => (
                <div key={slot.time}>
                  <label
                    className={cn(
                      "flex justify-between items-center p-4 rounded-md border transition-all",
                      slot.available 
                        ? selectedTimeSlot === slot.time
                          ? "bg-booqit-primary text-white border-booqit-primary"
                          : "bg-white hover:border-booqit-primary/50 border-gray-200"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border-transparent"
                    )}
                  >
                    <div className="flex items-center">
                      <RadioGroupItem
                        value={slot.time}
                        disabled={!slot.available}
                        className={selectedTimeSlot === slot.time ? "border-white text-white" : ""}
                      />
                      <span className="ml-2">{slot.time}</span>
                    </div>
                  </label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No available time slots for the selected date</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedTimeSlot}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default BookingPage;
