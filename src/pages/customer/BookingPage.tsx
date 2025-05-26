
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, isWeekend } from 'date-fns';

const BookingPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff } = location.state;

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<Array<{date: string, time_slot: string}>>([]);

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

        // Generate available dates (next 30 days, excluding holidays and weekends)
        const dates: string[] = [];
        for (let i = 1; i <= 30; i++) {
          const date = addDays(new Date(), i);
          const dateStr = format(date, 'yyyy-MM-dd');
          
          if (!isWeekend(date) && !allHolidays.includes(dateStr)) {
            dates.push(dateStr);
          }
        }
        
        setAvailableDates(dates);
      } catch (error) {
        console.error('Error fetching availability data:', error);
        toast.error('Could not load availability');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailabilityData();
  }, [merchantId, selectedStaff]);

  useEffect(() => {
    const generateTimeSlots = async () => {
      if (!selectedDate || !merchant) return;

      try {
        // Fetch existing bookings for the selected date
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('time_slot')
          .eq('merchant_id', merchantId)
          .eq('date', selectedDate)
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
              slot.date === selectedDate && slot.time_slot === timeSlot
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
        selectedDate,
        selectedTime
      }
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
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

        {/* Date Selection */}
        <div className="mb-6">
          <h3 className="font-medium mb-3 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Select Date
          </h3>
          <RadioGroup value={selectedDate} onValueChange={setSelectedDate} className="space-y-2">
            {availableDates.slice(0, 7).map((date) => (
              <Card 
                key={date}
                className={`border transition-all overflow-hidden ${selectedDate === date ? 'border-booqit-primary' : 'border-gray-200'}`}
              >
                <CardContent className="p-0">
                  <label htmlFor={date} className="flex items-center justify-between p-4 cursor-pointer">
                    <div className="flex items-center">
                      <RadioGroupItem value={date} id={date} className="mr-4" />
                      <div>
                        <div className="font-medium">{format(new Date(date), 'EEEE, MMM d')}</div>
                        <div className="text-gray-500 text-sm">{format(new Date(date), 'yyyy')}</div>
                      </div>
                    </div>
                  </label>
                </CardContent>
              </Card>
            ))}
          </RadioGroup>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="mb-6">
            <h3 className="font-medium mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Select Time
            </h3>
            {availableTimeSlots.length > 0 ? (
              <RadioGroup value={selectedTime} onValueChange={setSelectedTime} className="grid grid-cols-3 gap-3">
                {availableTimeSlots.map((time) => (
                  <Card 
                    key={time}
                    className={`border transition-all overflow-hidden ${selectedTime === time ? 'border-booqit-primary' : 'border-gray-200'}`}
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
