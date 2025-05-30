import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, isWeekend, startOfDay, isBefore } from 'date-fns';
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
  const [shopHolidays, setShopHolidays] = useState<string[]>([]);
  const [merchantTiming, setMerchantTiming] = useState<{open_time: string, close_time: string} | null>(null);

  // Fetch merchant timing and shop holidays
  useEffect(() => {
    const fetchMerchantData = async () => {
      try {
        if (!merchantId) return;

        // Fetch merchant timing
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('open_time, close_time')
          .eq('id', merchantId)
          .single();

        if (merchantData) {
          setMerchantTiming(merchantData);
        }

        // Fetch shop holidays
        const { data: shopHolidays } = await supabase
          .from('shop_holidays')
          .select('holiday_date')
          .eq('merchant_id', merchantId)
          .gte('holiday_date', format(new Date(), 'yyyy-MM-dd')); // Only future and today's holidays

        const holidayDates = (shopHolidays || []).map(h => h.holiday_date);
        setShopHolidays(holidayDates);
      } catch (error) {
        console.error('Error fetching merchant data:', error);
      }
    };

    fetchMerchantData();
  }, [merchantId]);

  const getAvailableDates = () => {
    const dates: Date[] = [];
    let currentDate = new Date();
    let attempts = 0;
    const maxAttempts = 30; // Look ahead 30 days maximum
    
    while (dates.length < 7 && attempts < maxAttempts) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Check if it's not a weekend, not a shop holiday, and not in the past
      if (!isWeekend(currentDate) && 
          !shopHolidays.includes(dateStr) && 
          !isBefore(currentDate, startOfDay(new Date()))) {
        dates.push(new Date(currentDate));
      }
      
      currentDate = addDays(currentDate, 1);
      attempts++;
    }
    
    return dates;
  };

  const availableDates = getAvailableDates();

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !merchantId || !merchantTiming) return;

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

        // Fetch available slots with improved filtering
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

        // Process slots and filter out holidays, past times, and times outside business hours
        const processedSlots = (slotsData || [])
          .filter((slot: AvailableSlot) => {
            // Filter out shop holidays and stylist holidays
            if (slot.is_shop_holiday || slot.is_stylist_holiday) {
              return false;
            }
            
            // Filter out times outside business hours
            const slotTime = slot.time_slot.substring(0, 5); // Ensure HH:MM format
            const openTime = merchantTiming.open_time;
            const closeTime = merchantTiming.close_time;
            
            if (slotTime < openTime || slotTime >= closeTime) {
              return false;
            }
            
            // Additional frontend filtering for past time slots
            if (isToday(selectedDateStr)) {
              const isPast = isTimeSlotInPast(slotTime, selectedDateStr, 30);
              console.log(`Slot ${slotTime} is past:`, isPast);
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

        // Show holiday messages if applicable but no slots were found due to holidays
        const allSlots = slotsData || [];
        const shopHoliday = allSlots.find((slot: AvailableSlot) => slot.is_shop_holiday);
        if (shopHoliday && processedSlots.length === 0) {
          toast.info(`Shop is closed: ${shopHoliday.shop_holiday_reason || 'Holiday'}`);
        }

        const stylistHoliday = allSlots.find((slot: AvailableSlot) => slot.is_stylist_holiday);
        if (stylistHoliday && processedSlots.length === 0) {
          toast.info(`Stylist unavailable: ${stylistHoliday.stylist_holiday_reason || 'Holiday'}`);
        }

      } catch (error) {
        console.error('Error fetching available slots:', error);
        toast.error('Could not load time slots');
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, merchantId, selectedStaff, totalDuration, merchantTiming]);

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

  const uniqueTimeSlots = Array.from(new Set(availableSlots.map(slot => slot.time_slot))).sort();

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
          {availableDates.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No available dates</p>
              <p className="text-gray-400 text-sm">Shop is closed or no working days available</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableDates.slice(0, 6).map((date) => {
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
          )}
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
            ) : uniqueTimeSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {uniqueTimeSlots.map((time) => (
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
