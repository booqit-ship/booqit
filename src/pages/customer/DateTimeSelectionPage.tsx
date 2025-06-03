
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { formatDateInIST, isTodayIST } from '@/utils/dateUtils';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { CalendarIcon, Clock, User, ArrowLeft, MapPin } from 'lucide-react';
import { useSlotLocking } from '@/hooks/useSlotLocking';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason?: string;
  is_shop_holiday?: boolean;
  is_stylist_holiday?: boolean;
  shop_holiday_reason?: string;
  stylist_holiday_reason?: string;
}

interface MerchantData {
  id: string;
  shop_name: string;
  address: string;
  open_time: string;
  close_time: string;
}

interface ServiceData {
  id: string;
  name: string;
  duration: number;
  price: number;
}

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const serviceId = searchParams.get('serviceId');
  const selectedStaff = searchParams.get('staffId');
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
  const [serviceData, setServiceData] = useState<ServiceData | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [stylistHolidays, setStylistHolidays] = useState<string[]>([]);
  
  const { lockSlot, releaseLock, isLocking, lockedSlot } = useSlotLocking();

  // Helper functions
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getCurrentISTTimeWithBuffer = (): number => {
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const currentMinutes = istTime.getHours() * 60 + istTime.getMinutes();
    const bufferedMinutes = currentMinutes + 40;
    return Math.ceil(bufferedMinutes / 10) * 10;
  };

  // Clear selected time when date changes
  useEffect(() => {
    setSelectedTime('');
    setSelectedStaffId('');
    if (lockedSlot) {
      releaseLock();
    }
  }, [selectedDate, selectedStaff]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!merchantId || !serviceId) return;

      try {
        console.log('=== FETCHING INITIAL DATA ===');
        console.log('Merchant ID:', merchantId);
        console.log('Service ID:', serviceId);
        console.log('Selected Staff:', selectedStaff);

        // Fetch merchant data
        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('id, shop_name, address, open_time, close_time')
          .eq('id', merchantId)
          .single();

        if (merchantError || !merchant) {
          console.error('Merchant not found:', merchantError);
          setError('Merchant not found. Please check the booking link.');
          return;
        }

        console.log('Merchant found:', merchant);
        setMerchantData(merchant);

        // Fetch service data
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('id, name, duration, price')
          .eq('id', serviceId)
          .single();

        if (serviceError || !service) {
          console.error('Service not found:', serviceError);
          setError('Service not found. Please go back and select a service.');
          return;
        }

        console.log('Service found:', service);
        setServiceData(service);

        // Fetch holidays
        const { data: holidaysData } = await supabase
          .from('shop_holidays')
          .select('holiday_date')
          .eq('merchant_id', merchantId);

        const holidayDates = holidaysData?.map(h => h.holiday_date) || [];
        setHolidays(holidayDates);
        console.log('Shop holidays:', holidayDates);

        // Fetch stylist holidays if specific staff selected
        if (selectedStaff) {
          const { data: stylistHolidaysData } = await supabase
            .from('stylist_holidays')
            .select('holiday_date')
            .eq('staff_id', selectedStaff);

          const stylistHolidayDates = stylistHolidaysData?.map(h => h.holiday_date) || [];
          setStylistHolidays(stylistHolidayDates);
          console.log('Stylist holidays:', stylistHolidayDates);
        }

      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError('Unable to load booking information. Please try again.');
      }
    };

    fetchInitialData();
  }, [merchantId, serviceId, selectedStaff]);

  // Fetch available slots
  const fetchAvailableSlots = async () => {
    if (!selectedDate || !merchantId || !serviceData) {
      console.log('Missing required data for slot fetching');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      const isToday = isTodayIST(selectedDate);
      
      console.log('=== FETCHING SLOTS DEBUG ===');
      console.log('Date:', selectedDateStr);
      console.log('Is Today:', isToday);
      console.log('Merchant ID:', merchantId);
      console.log('Selected Staff:', selectedStaff);
      console.log('Service Duration:', serviceData.duration);
      console.log('Current IST Time:', formatDateInIST(new Date(), 'yyyy-MM-dd HH:mm:ss'));

      // Check if selected date is a holiday
      if (holidays.includes(selectedDateStr)) {
        console.log('Selected date is a shop holiday');
        setError('Shop is closed on this date');
        setAvailableSlots([]);
        return;
      }

      if (selectedStaff && stylistHolidays.includes(selectedDateStr)) {
        console.log('Selected date is a stylist holiday');
        setError('Selected stylist is not available on this date');
        setAvailableSlots([]);
        return;
      }

      // Check if it's too late to book for today
      if (isToday && merchantData) {
        const merchantCloseTimeInMinutes = timeToMinutes(merchantData.close_time);
        const currentBufferedTimeInMinutes = getCurrentISTTimeWithBuffer();
        
        if (currentBufferedTimeInMinutes >= merchantCloseTimeInMinutes) {
          console.log('Buffered time is past merchant closing time for today');
          setError(`No slots available today. The shop closes at ${formatTimeToAmPm(merchantData.close_time)} and a 40-minute buffer applies.`);
          setAvailableSlots([]);
          return;
        }
      }

      // Check if staff exist for the merchant
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name')
        .eq('merchant_id', merchantId);

      if (staffError) {
        console.error('Error checking staff:', staffError);
        setError('Unable to check staff availability. Please try again.');
        setAvailableSlots([]);
        return;
      }

      if (!staffData || staffData.length === 0) {
        console.log('No staff found for merchant');
        setError('No stylists available for this merchant');
        setAvailableSlots([]);
        return;
      }

      console.log('Found staff:', staffData.length, 'stylists');

      // Fetch slots using the updated get_available_slots function
      console.log('Fetching available slots with updated function...');
      const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots', {
        p_merchant_id: merchantId,
        p_date: selectedDateStr,
        p_staff_id: selectedStaff || null,
        p_service_duration: serviceData.duration
      });

      if (slotsError) {
        console.error('Error fetching slots:', slotsError);
        setError('Unable to load time slots. Please try refreshing the page.');
        setAvailableSlots([]);
        return;
      }

      console.log('Raw slots data received:', slotsData?.length || 0, 'slots');
      console.log('Sample slots:', slotsData?.slice(0, 3));

      if (!slotsData || slotsData.length === 0) {
        console.log('No slots returned from function');
        if (isToday) {
          setError('No slots available today. All slots might be booked or it may be too late to book for today due to a 40-minute buffer period.');
        } else {
          setError('No slots available for this date. The shop might be closed or fully booked.');
        }
        setAvailableSlots([]);
        return;
      }

      // Process the slots data - the function now returns is_available and conflict_reason
      const processedSlots = slotsData.map((slot: any) => ({
        staff_id: slot.staff_id,
        staff_name: slot.staff_name,
        time_slot: typeof slot.time_slot === 'string' ? slot.time_slot.substring(0, 5) : formatDateInIST(new Date(`2000-01-01T${slot.time_slot}`), 'HH:mm'),
        is_available: slot.is_available,
        conflict_reason: slot.conflict_reason,
        is_shop_holiday: slot.is_shop_holiday,
        is_stylist_holiday: slot.is_stylist_holiday,
        shop_holiday_reason: slot.shop_holiday_reason,
        stylist_holiday_reason: slot.stylist_holiday_reason
      }));

      console.log('Final processed slots:', processedSlots.length);
      console.log('Available slots:', processedSlots.filter(s => s.is_available).length);
      console.log('Unavailable slots:', processedSlots.filter(s => !s.is_available).length);

      setAvailableSlots(processedSlots);

      // Show message if no available slots after processing
      const availableCount = processedSlots.filter(s => s.is_available).length;
      if (availableCount === 0) {
        if (isToday) {
          setError('No slots available today. All slots might be booked or it may be too late to book for today due to a 40-minute buffer period.');
        } else {
          setError('No slots available for this date. All slots might be booked.');
        }
      } else {
        console.log(`Found ${availableCount} available slots`);
      }

    } catch (error) {
      console.error('Error in fetchAvailableSlots:', error);
      setError('Unable to load time slots. Please check your connection and try again.');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch slots when dependencies change
  useEffect(() => {
    fetchAvailableSlots();
  }, [selectedDate, merchantId, serviceData, selectedStaff]);

  // Setup realtime updates
  useRealtimeSlots({
    selectedDate,
    selectedStaff,
    merchantId: merchantId || '',
    onSlotChange: fetchAvailableSlots,
    selectedTime,
    onSelectedTimeInvalidated: () => {
      setSelectedTime('');
      setSelectedStaffId('');
      if (lockedSlot) {
        releaseLock();
      }
    }
  });

  const handleTimeSelect = async (slot: AvailableSlot) => {
    if (!slot.is_available) {
      toast.error(slot.conflict_reason || 'This slot is not available');
      return;
    }

    // Release previous lock if any
    if (lockedSlot) {
      await releaseLock();
    }

    const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
    
    console.log('Attempting to lock slot:', {
      staff_id: slot.staff_id,
      date: selectedDateStr,
      time_slot: slot.time_slot
    });

    const success = await lockSlot(slot.staff_id, selectedDateStr, slot.time_slot);
    
    if (success) {
      setSelectedTime(slot.time_slot);
      setSelectedStaffId(slot.staff_id);
      console.log('Slot locked successfully');
    } else {
      console.log('Failed to lock slot');
      // Error message is handled by the lockSlot function
    }
  };

  const handleContinue = async () => {
    if (!selectedTime || !selectedStaffId || !serviceData) {
      toast.error('Please select a time slot first');
      return;
    }

    const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
    
    try {
      console.log('Creating booking with:', {
        merchantId,
        serviceId,
        staffId: selectedStaffId,
        date: selectedDateStr,
        timeSlot: selectedTime,
        serviceDuration: serviceData.duration
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to continue with booking');
        navigate('/auth');
        return;
      }

      // Create confirmed booking
      const { data: bookingResult, error: bookingError } = await supabase.rpc('create_confirmed_booking', {
        p_user_id: user.id,
        p_merchant_id: merchantId,
        p_service_id: serviceId,
        p_staff_id: selectedStaffId,
        p_date: selectedDateStr,
        p_time_slot: selectedTime,
        p_service_duration: serviceData.duration
      });

      if (bookingError) {
        console.error('Booking error:', bookingError);
        toast.error('Failed to create booking. Please try again.');
        return;
      }

      if (!bookingResult.success) {
        toast.error(bookingResult.error || 'Failed to create booking');
        return;
      }

      console.log('Booking created successfully:', bookingResult);
      toast.success('Booking confirmed successfully!');
      
      // Navigate to booking summary
      navigate(`/customer/booking/${merchantId}/summary/${bookingResult.booking_id}`);

    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  const getAvailableDates = () => {
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      const dateStr = formatDateInIST(date, 'yyyy-MM-dd');
      if (!holidays.includes(dateStr) && (!selectedStaff || !stylistHolidays.includes(dateStr))) {
        dates.push(date);
      }
    }
    return dates;
  };

  const groupSlotsByStaff = () => {
    const grouped: { [key: string]: { name: string; slots: AvailableSlot[] } } = {};
    
    availableSlots.forEach(slot => {
      if (!grouped[slot.staff_id]) {
        grouped[slot.staff_id] = {
          name: slot.staff_name,
          slots: []
        };
      }
      grouped[slot.staff_id].slots.push(slot);
    });
    
    return grouped;
  };

  if (!merchantId || !serviceId) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Booking Link</h1>
          <p className="text-gray-600">Please check your booking link and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Select Date & Time</h1>
          {merchantData && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <MapPin className="h-4 w-4" />
              {merchantData.shop_name} • {merchantData.address}
            </div>
          )}
        </div>
      </div>

      {serviceData && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{serviceData.name}</h3>
                <p className="text-sm text-gray-600">Duration: {serviceData.duration} minutes</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{serviceData.price}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => {
                const today = startOfDay(new Date());
                const dateStr = formatDateInIST(date, 'yyyy-MM-dd');
                return date < today || holidays.includes(dateStr) || (selectedStaff && stylistHolidays.includes(dateStr));
              }}
              className="rounded-md border"
            />
            {selectedDate && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm font-medium">Selected Date:</p>
                <p className="text-blue-700">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading available times...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchAvailableSlots} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupSlotsByStaff()).map(([staffId, staffData]) => (
                  <div key={staffId}>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{staffData.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {staffData.slots
                        .filter(slot => slot.is_available)
                        .map((slot) => (
                        <Button
                          key={`${slot.staff_id}-${slot.time_slot}`}
                          variant={selectedTime === slot.time_slot && selectedStaffId === slot.staff_id ? "default" : "outline"}
                          size="sm"
                          className="text-xs h-10"
                          onClick={() => handleTimeSelect(slot)}
                          disabled={!slot.is_available || isLocking}
                        >
                          {formatTimeToAmPm(slot.time_slot)}
                        </Button>
                      ))}
                    </div>
                    {staffData.slots.filter(slot => slot.is_available).length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">No available slots for this stylist</p>
                    )}
                  </div>
                ))}
                
                {Object.keys(groupSlotsByStaff()).length === 0 && !loading && !error && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No available time slots for the selected date.</p>
                    <p className="text-sm text-gray-500 mt-2">Please try a different date.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected slot info */}
      {selectedTime && selectedStaffId && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Booking Summary</h3>
                <p className="text-sm text-gray-600">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {formatTimeToAmPm(selectedTime)}
                </p>
                <p className="text-sm text-gray-600">
                  Stylist: {availableSlots.find(s => s.staff_id === selectedStaffId)?.staff_name}
                </p>
                {lockedSlot && (
                  <Badge variant="secondary" className="mt-2">
                    Slot Reserved (10 minutes)
                  </Badge>
                )}
              </div>
              <Button 
                onClick={handleContinue}
                disabled={!selectedTime || !selectedStaffId}
                className="min-w-[120px]"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DateTimeSelectionPage;
