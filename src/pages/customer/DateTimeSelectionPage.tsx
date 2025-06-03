
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSlotLocking } from '@/hooks/useSlotLocking';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';

interface TimeSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason?: string;
}

interface BookingState {
  merchantId: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  staffId?: string;
  staffName?: string;
}

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { lockSlot, releaseLock, isLocking, lockedSlot } = useSlotLocking();

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookingState = location.state as BookingState;

  useEffect(() => {
    if (!bookingState) {
      toast({
        title: "Error",
        description: "Booking information not found. Please start over.",
        variant: "destructive",
      });
      navigate(`/booking/${merchantId}`);
      return;
    }
  }, [bookingState, merchantId, navigate, toast]);

  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDate || !merchantId || !bookingState) return;

    setIsLoadingSlots(true);
    setError(null);

    try {
      console.log('Fetching slots for:', {
        merchantId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        staffId: selectedStaff,
        serviceDuration: bookingState.serviceDuration
      });

      const { data, error } = await supabase.rpc('get_available_slots_with_validation' as any, {
        p_merchant_id: merchantId,
        p_date: format(selectedDate, 'yyyy-MM-dd'),
        p_staff_id: selectedStaff,
        p_service_duration: bookingState.serviceDuration || 30
      });

      if (error) {
        console.error('Error fetching available slots:', error);
        throw new Error(error.message || 'Failed to fetch available slots');
      }

      console.log('Available slots response:', data);

      if (!data || data.length === 0) {
        setAvailableSlots([]);
        setError('No available time slots for the selected date. Please choose a different date.');
        return;
      }

      const slotsData: TimeSlot[] = data.map((slot: any) => ({
        staff_id: slot.staff_id,
        staff_name: slot.staff_name,
        time_slot: slot.time_slot,
        is_available: slot.is_available,
        conflict_reason: slot.conflict_reason
      }));

      setAvailableSlots(slotsData);
    } catch (error: any) {
      console.error('Error in fetchAvailableSlots:', error);
      setError(error.message || 'Could not load available time slots. Please try again.');
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedDate, merchantId, selectedStaff, bookingState]);

  // Set up real-time updates
  useRealtimeSlots({
    selectedDate,
    selectedStaff,
    merchantId: merchantId || '',
    onSlotChange: fetchAvailableSlots,
    selectedTime,
    onSelectedTimeInvalidated: () => {
      setSelectedTime('');
      if (lockedSlot) {
        releaseLock();
      }
    }
  });

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  const handleTimeSlotClick = async (slot: TimeSlot) => {
    if (!slot.is_available) {
      toast({
        title: "Slot Unavailable",
        description: slot.conflict_reason || "This time slot is not available.",
        variant: "destructive",
      });
      return;
    }

    // Release previous lock if exists
    if (lockedSlot) {
      await releaseLock();
    }

    // Try to lock the new slot
    const lockSuccess = await lockSlot(
      slot.staff_id,
      format(selectedDate!, 'yyyy-MM-dd'),
      slot.time_slot
    );

    if (lockSuccess) {
      setSelectedTime(slot.time_slot);
      setSelectedStaff(slot.staff_id);
    }
  };

  const handleContinueToPayment = () => {
    if (!selectedTime || !selectedStaff || !selectedDate) {
      toast({
        title: "Selection Required",
        description: "Please select a date and time slot.",
        variant: "destructive",
      });
      return;
    }

    const selectedSlot = availableSlots.find(
      slot => slot.time_slot === selectedTime && slot.staff_id === selectedStaff
    );

    if (!selectedSlot?.is_available) {
      toast({
        title: "Slot No Longer Available",
        description: "The selected time slot is no longer available. Please select another slot.",
        variant: "destructive",
      });
      setSelectedTime('');
      return;
    }

    navigate(`/booking/${merchantId}/summary`, {
      state: {
        ...bookingState,
        staffId: selectedStaff,
        staffName: selectedSlot.staff_name,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timeSlot: selectedTime,
      },
    });
  };

  const handleRefreshSlots = () => {
    fetchAvailableSlots();
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const groupSlotsByStaff = (slots: TimeSlot[]) => {
    const grouped: { [key: string]: { staff: string; slots: TimeSlot[] } } = {};
    
    slots.forEach(slot => {
      if (!grouped[slot.staff_id]) {
        grouped[slot.staff_id] = {
          staff: slot.staff_name,
          slots: []
        };
      }
      grouped[slot.staff_id].slots.push(slot);
    });
    
    return grouped;
  };

  if (!bookingState) {
    return null;
  }

  const groupedSlots = groupSlotsByStaff(availableSlots);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Real-time updates enabled
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="w-5 h-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((dayOffset) => {
                  const date = addDays(new Date(), dayOffset);
                  const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  
                  return (
                    <Button
                      key={dayOffset}
                      variant={isSelected ? "default" : "outline"}
                      className={`p-4 h-auto flex flex-col ${
                        isSelected ? 'bg-booqit-primary text-white' : ''
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="text-xs opacity-80">{getDateLabel(date)}</span>
                      <span className="text-2xl font-bold">{format(date, 'd')}</span>
                      <span className="text-xs opacity-80">{format(date, 'MMM')}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5" />
                  Available Time Slots
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshSlots}
                  disabled={isLoadingSlots}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingSlots ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-600 text-sm">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshSlots}
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : Object.keys(groupedSlots).length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No available time slots</p>
                  <p className="text-sm text-gray-400 mb-4">Please select a different date or try again later</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshSlots}
                  >
                    Refresh Slots
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedSlots).map(([staffId, { staff, slots }]) => (
                    <div key={staffId}>
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-800">{staff}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((slot) => {
                          const isSelected = selectedTime === slot.time_slot && selectedStaff === slot.staff_id;
                          const isLocked = lockedSlot?.staffId === slot.staff_id && 
                                         lockedSlot?.timeSlot === slot.time_slot;
                          
                          return (
                            <Button
                              key={`${slot.staff_id}-${slot.time_slot}`}
                              variant={isSelected ? "default" : "outline"}
                              className={`text-sm h-auto py-3 ${
                                !slot.is_available 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : isSelected 
                                    ? 'bg-booqit-primary text-white' 
                                    : 'hover:bg-booqit-primary/10'
                              }`}
                              onClick={() => handleTimeSlotClick(slot)}
                              disabled={!slot.is_available || isLocking}
                            >
                              <div className="flex flex-col items-center">
                                <span>{format(new Date(`2000-01-01T${slot.time_slot}`), 'h:mm a')}</span>
                                {isLocked && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    Reserved
                                  </Badge>
                                )}
                                {!slot.is_available && !isLocked && (
                                  <span className="text-xs mt-1 opacity-60">Unavailable</span>
                                )}
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Button
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-white py-3 text-lg"
          onClick={handleContinueToPayment}
          disabled={!selectedTime || !selectedStaff || isLoadingSlots}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
