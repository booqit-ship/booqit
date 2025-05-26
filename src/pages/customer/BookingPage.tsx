
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, isWeekend, startOfDay, isBefore, isAfter, addWeeks } from 'date-fns';

const BookingPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff } = location.state;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<Array<{date: string, time_slot: string}>>([]);

  // Get next 3 available dates (today + next 2 days, excluding weekends and holidays)
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

  useEffect(() => {
    const generateTimeSlots = async () => {
      if (!selectedDate || !merchant) return;

      setLoading(true);
      try {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

        // Fetch existing bookings for the selected date
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('time_slot')
          .eq('merchant_id', merchantId)
          .eq('date', selectedDateStr)
          .eq('status', 'confirmed');

        // Generate time slots based on merchant hours
        const slots: string[] = [];
        const openHour = parseInt(merchant.open_time.split(':')[0]);
        const closeHour = parseInt(merchant.close_time.split(':')[0]);

        for (let hour = openHour; hour < closeHour; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Check if slot is not booked
            const isBooked = existingBookings?.some(booking => booking.time_slot === timeSlot);
            
            // Check if slot is blocked for selected staff
            const isBlocked = blockedSlots.some(slot => 
              slot.date === selectedDateStr && slot.time_slot === timeSlot
            );
            
            if (!isBooked && !isBlocked) {
              slots.push(timeSlot);
            }
          }
        }

        setAvailableTimeSlots(slots);
      } catch (error) {
        console.error('Error generating time slots:', error);
        toast.error('Could not load time slots');
      } finally {
        setLoading(false);
      }
    };

    generateTimeSlots();
  }, [selectedDate, merchant, merchantId, blockedSlots]);

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    navigate(`/booking/${merchantId}/summary`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff,
        selectedDate: format(selectedDate, 'yyyy-MM-dd'),
        selectedTime
      }
    });
  };

  const isDateDisabled = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const today = startOfDay(new Date());
    const twoWeeksFromNow = addWeeks(today, 2);
    
    return (
      isBefore(date, today) ||
      isAfter(date, twoWeeksFromNow) ||
      isWeekend(date) ||
      holidays.includes(dateStr)
    );
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

        {/* Date Selection - Calendar View */}
        <div className="mb-6">
          <h3 className="font-medium mb-3 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Select Date
          </h3>
          <Card className="p-4">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDateDisabled}
              className="w-full"
              initialFocus
            />
          </Card>
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
              <RadioGroup value={selectedTime} onValueChange={setSelectedTime} className="grid grid-cols-3 gap-3">
                {availableTimeSlots.map((time) => (
                  <Card 
                    key={time}
                    className={`border transition-all overflow-hidden cursor-pointer ${
                      selectedTime === time ? 'border-booqit-primary bg-booqit-primary text-white' : 'border-gray-200 hover:border-booqit-primary/50'
                    }`}
                  >
                    <CardContent className="p-0">
                      <label htmlFor={time} className="flex items-center justify-center p-3 cursor-pointer">
                        <RadioGroupItem value={time} id={time} className="sr-only" />
                        <div className="text-center">
                          <div className="font-medium">{time}</div>
                        </div>
                      </label>
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>
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
          Continue to Summary
        </Button>
      </div>
    </div>
  );
};

export default BookingPage;
