
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { 
  formatDateInIST, 
  getCurrentDateIST, 
  isTodayIST
} from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason: string | null;
}

interface BookingCreationResponse {
  success: boolean;
  booking_id?: string;
  error?: string;
  conflicting_slot?: string;
}

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff, selectedStaffDetails } = location.state || {};

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [holidays, setHolidays] = useState<string[]>([]);
  const [stylistHolidays, setStylistHolidays] = useState<string[]>([]);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  // Calculate actual service duration from selected services
  const actualServiceDuration = selectedServices && selectedServices.length > 0 
    ? selectedServices.reduce((total: number, service: any) => total + service.duration, 0)
    : totalDuration || 30;

  // Generate 3 days: today, tomorrow, day after tomorrow (using IST), excluding holidays
  const getAvailableDates = () => {
    const dates: Date[] = [];
    const todayIST = getCurrentDateIST();
    
    for (let i = 0; i < 3; i++) {
      const date = addDays(todayIST, i);
      const dateStr = formatDateInIST(date, 'yyyy-MM-dd');
      
      // Exclude shop holidays and stylist holidays
      if (!holidays.includes(dateStr) && !stylistHolidays.includes(dateStr)) {
        dates.push(date);
      }
    }
    
    return dates;
  };

  const availableDates = getAvailableDates();

  // Set today (IST) as default selected date
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates]);

  // Fetch holidays data
  useEffect(() => {
    const fetchHolidays = async () => {
      if (!merchantId) return;

      try {
        // Fetch shop holidays
        const { data: shopHolidays } = await supabase
          .from('shop_holidays')
          .select('holiday_date')
          .eq('merchant_id', merchantId);

        const shopHolidayDates = (shopHolidays || []).map(h => h.holiday_date);
        setHolidays(shopHolidayDates);

        // Fetch stylist holidays if specific staff is selected
        if (selectedStaff) {
          const { data: staffHolidays } = await supabase
            .from('stylist_holidays')
            .select('holiday_date')
            .eq('staff_id', selectedStaff);

          const staffHolidayDates = (staffHolidays || []).map(h => h.holiday_date);
          setStylistHolidays(staffHolidayDates);
        }

      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    };

    fetchHolidays();
  }, [merchantId, selectedStaff]);

  // Fetch available slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !merchantId) return;

      setLoading(true);
      setError('');
      setSelectedTime(''); // Reset selected time when date changes
      
      try {
        const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
        console.log('Fetching slots for date:', selectedDateStr, 'Staff:', selectedStaff, 'Service duration:', actualServiceDuration);

        // Use the get_available_slots_with_validation function with proper parameters
        const { data: slotsData, error: slotsError } = await supabase.rpc('get_available_slots_with_validation', {
          p_merchant_id: merchantId,
          p_date: selectedDateStr,
          p_staff_id: selectedStaff || null,
          p_service_duration: actualServiceDuration
        });

        if (slotsError) {
          console.error('Error fetching available slots:', slotsError);
          setError('Could not load available time slots. Please try again.');
          setAvailableSlots([]);
          return;
        }

        console.log('Raw slots data:', slotsData);

        if (!slotsData || !Array.isArray(slotsData) || slotsData.length === 0) {
          console.log('No slots returned from database');
          setAvailableSlots([]);
          return;
        }

        // Process the slots data - filter available slots only
        const processedSlots = (slotsData as AvailableSlot[])
          .filter((slot: AvailableSlot) => slot.is_available)
          .map((slot: AvailableSlot) => ({
            staff_id: slot.staff_id,
            staff_name: slot.staff_name,
            time_slot: typeof slot.time_slot === 'string' ? slot.time_slot.substring(0, 5) : formatDateInIST(new Date(`2000-01-01T${slot.time_slot}`), 'HH:mm'),
            is_available: true,
            conflict_reason: null
          }));

        console.log('Processed slots:', processedSlots);
        setAvailableSlots(processedSlots);

      } catch (error) {
        console.error('Error fetching available slots:', error);
        setError('Could not load time slots. Please try again.');
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, merchantId, selectedStaff, actualServiceDuration]);

  const handleTimeSlotClick = async (timeSlot: string) => {
    if (!selectedDate || !merchantId) return;
    
    // Find available slot for this time
    const availableSlot = availableSlots.find(slot => 
      slot.time_slot === timeSlot && slot.is_available
    );
    
    if (!availableSlot) {
      toast.error('This time slot is not available');
      return;
    }

    setSelectedTime(timeSlot);
    console.log('Time slot selected successfully:', timeSlot);
  };

  const handleContinue = async () => {
    if (!selectedDate || !selectedTime || !userId) {
      toast.error('Please select both date and time');
      return;
    }

    const selectedSlot = availableSlots.find(slot => 
      slot.time_slot === selectedTime && slot.is_available
    );
    
    if (!selectedSlot) {
      toast.error('Selected time slot is not available');
      return;
    }

    setIsCreatingBooking(true);

    try {
      const selectedDateStr = formatDateInIST(selectedDate, 'yyyy-MM-dd');
      const finalStaffId = selectedStaff || selectedSlot.staff_id;
      const serviceId = selectedServices[0]?.id;

      if (!serviceId) {
        toast.error('Service information is missing');
        return;
      }

      console.log('Creating confirmed booking with data:', {
        userId,
        merchantId,
        serviceId,
        finalStaffId,
        selectedDateStr,
        selectedTime,
        actualServiceDuration
      });

      // Create booking immediately with confirmed status using atomic function
      const { data: bookingResult, error: bookingError } = await supabase.rpc('create_confirmed_booking', {
        p_user_id: userId,
        p_merchant_id: merchantId,
        p_service_id: serviceId,
        p_staff_id: finalStaffId,
        p_date: selectedDateStr,
        p_time_slot: selectedTime,
        p_service_duration: actualServiceDuration
      });

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        
        if (bookingError.message.includes('overlaps') || bookingError.message.includes('booked')) {
          toast.error('This time slot is no longer available. Please select another time.');
          // Refresh slots to show updated availability
          setSelectedDate(new Date(selectedDate));
          setSelectedTime('');
        } else {
          toast.error(`Failed to create booking: ${bookingError.message}`);
        }
        return;
      }

      const response = bookingResult as unknown as BookingCreationResponse;
      
      if (!response.success) {
        const errorMessage = response.error || 'Time slot is no longer available';
        toast.error(errorMessage);
        
        if (errorMessage.includes('overlaps') || errorMessage.includes('available')) {
          // Refresh slots to show updated availability
          setSelectedDate(new Date(selectedDate));
          setSelectedTime('');
        }
        return;
      }

      const bookingId = response.booking_id;

      console.log('Booking created successfully:', bookingId);
      toast.success('Slot reserved! Proceeding to payment...');

      const finalStaffDetails = selectedStaffDetails || { name: selectedSlot.staff_name };

      // Navigate to payment page with booking ID
      navigate(`/payment/${merchantId}`, {
        state: {
          merchant,
          selectedServices,
          totalPrice,
          totalDuration: actualServiceDuration,
          selectedStaff: finalStaffId,
          selectedStaffDetails: finalStaffDetails,
          bookingDate: selectedDateStr,
          bookingTime: selectedTime,
          bookingId: bookingId
        }
      });

    } catch (error) {
      console.error('Error in booking creation:', error);
      toast.error('Error creating booking. Please try again.');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const formatDateDisplay = (date: Date) => {
    const todayIST = getCurrentDateIST();
    const tomorrowIST = addDays(todayIST, 1);
    
    if (formatDateInIST(date, 'yyyy-MM-dd') === formatDateInIST(todayIST, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (formatDateInIST(date, 'yyyy-MM-dd') === formatDateInIST(tomorrowIST, 'yyyy-MM-dd')) {
      return 'Tomorrow';
    } else {
      return formatDateInIST(date, 'EEE, MMM d');
    }
  };

  // Get unique available slots and sort by time
  const uniqueAvailableSlots = Array.from(new Map(
    availableSlots.map(slot => [slot.time_slot, slot])
  ).values()).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

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
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Live Updates
              </span>
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    setError('');
                    setSelectedDate(new Date(selectedDate));
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
              </div>
            ) : uniqueAvailableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {uniqueAvailableSlots.map((slot) => (
                  <Button
                    key={slot.time_slot}
                    variant={selectedTime === slot.time_slot ? "default" : "outline"}
                    className={`p-3 ${
                      selectedTime === slot.time_slot ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                    }`}
                    onClick={() => handleTimeSlotClick(slot.time_slot)}
                  >
                    <span className="font-medium">{formatTimeToAmPm(slot.time_slot)}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No available time slots</p>
                <p className="text-gray-400 text-sm">
                  {isTodayIST(selectedDate) 
                    ? "All slots for today are either booked or too soon"
                    : "Please select a different date or try again later"
                  }
                </p>
                {!loading && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setSelectedDate(new Date(selectedDate))}
                  >
                    Refresh Slots
                  </Button>
                )}
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
          disabled={!selectedDate || !selectedTime || loading || isCreatingBooking}
        >
          {isCreatingBooking ? 'Reserving Slot...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
