
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, isWeekend, startOfDay } from 'date-fns';

const BookingPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff, selectedStaffDetails } = location.state;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<Array<{date: string, time_slot: string}>>([]);

  const getAvailableDates = () => {
    const dates: Date[] = [];
    let currentDate = new Date();
    
    while (dates.length < 3) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      if (!isWeekend(currentDate) && !holidays.includes(dateStr)) {
        dates.push(new Date(currentDate));
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  };

  const availableDates = getAvailableDates();

  useEffect(() => {
    const fetchAvailabilityData = async () => {
      try {
        if (!merchantId) return;

        // Fetch shop holidays
        const { data: shopHolidays } = await supabase
          .from('shop_holidays')
          .select('holiday_date')
          .eq('merchant_id', merchantId);

        // Fetch stylist holidays (if specific staff selected)
        let stylistHolidays: any[] = [];
        if (selectedStaff) {
          const { data } = await supabase
            .from('stylist_holidays')
            .select('holiday_date')
            .eq('staff_id', selectedStaff);
          stylistHolidays = data || [];
        }

        // Fetch blocked slots (if specific staff selected)
        let blockedSlotData: any[] = [];
        if (selectedStaff) {
          const { data } = await supabase
            .from('stylist_blocked_slots')
            .select('blocked_date, time_slot')
            .eq('staff_id', selectedStaff);
          blockedSlotData = data || [];
        }

        // Combine all holidays
        const allHolidays = [
          ...(shopHolidays || []).map(h => h.holiday_date),
          ...stylistHolidays.map(h => h.holiday_date)
        ];

        setHolidays(allHolidays);
        setBlockedSlots(blockedSlotData.map(slot => ({
          date: slot.blocked_date,
          time_slot: slot.time_slot
        })));
      } catch (error) {
        console.error('Error fetching availability data:', error);
        toast.error('Could not load availability');
      }
    };

    fetchAvailabilityData();
  }, [merchantId, selectedStaff]);

  const generateTimeSlots = (serviceDuration: number) => {
    const slots: string[] = [];
    if (!merchant) return slots;

    const openTime = merchant.open_time;
    const closeTime = merchant.close_time;
    
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);
    
    let currentTime = openHour * 60 + openMinute; // Convert to minutes
    const closeTimeInMinutes = closeHour * 60 + closeMinute;
    
    while (currentTime + serviceDuration <= closeTimeInMinutes) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      const timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      slots.push(timeSlot);
      
      // Move to next slot (30 minute intervals)
      currentTime += 30;
    }
    
    return slots;
  };

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !merchant || !selectedServices.length) return;

      setLoading(true);
      try {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

        // Generate base time slots for the total duration
        const baseSlots = generateTimeSlots(totalDuration);

        // Fetch existing bookings for the selected date
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('time_slot, staff_id')
          .eq('merchant_id', merchantId)
          .eq('date', selectedDateStr)
          .eq('status', 'confirmed');

        // Filter out booked and blocked slots
        const availableSlots = baseSlots.filter(slot => {
          // Check if slot is not booked
          const isBooked = existingBookings?.some(booking => {
            // If a specific staff is selected, only check bookings for that staff
            if (selectedStaff) {
              return booking.time_slot === slot && booking.staff_id === selectedStaff;
            }
            // If any staff, check all bookings for that time slot
            return booking.time_slot === slot;
          });
          
          // Check if slot is blocked for selected staff
          const isBlocked = blockedSlots.some(blockedSlot => 
            blockedSlot.date === selectedDateStr && blockedSlot.time_slot === slot
          );
          
          return !isBooked && !isBlocked;
        });

        setAvailableTimeSlots(availableSlots);
      } catch (error) {
        console.error('Error generating time slots:', error);
        toast.error('Could not load time slots');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, merchant, merchantId, blockedSlots, selectedServices, totalDuration, selectedStaff]);

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    navigate(`/payment/${merchantId}`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff,
        selectedStaffDetails,
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

        {/* Date Selection - 3 Day Format */}
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

        {/* Time Selection */}
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
            ) : availableTimeSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableTimeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    className={`p-3 ${
                      selectedTime === time ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                    }`}
                    onClick={() => setSelectedTime(time)}
                  >
                    <span className="font-medium">{time}</span>
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
