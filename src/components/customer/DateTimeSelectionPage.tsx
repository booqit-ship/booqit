
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { formatDateInIST, getCurrentDateIST, isTodayIST } from '@/utils/dateUtils';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { calculateTotalServiceDuration } from '@/utils/slotUtils';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { useSlotLocking } from '@/hooks/useSlotLocking';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';
import SlotSelector from '@/components/customer/SlotSelector';
import { toast } from 'sonner';

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    merchant,
    selectedServices,
    totalPrice,
    selectedStaff,
    selectedStaffDetails
  } = location.state || {};

  const [selectedDate, setSelectedDate] = useState<Date>(getCurrentDateIST());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);
  const [lockedSlotInfo, setLockedSlotInfo] = useState<{
    staffId: string;
    date: string;
    time: string;
    duration: number;
  } | null>(null);

  // Calculate total duration for all selected services
  const totalDuration = calculateTotalServiceDuration(selectedServices || []);

  // Use the improved available slots hook
  const {
    availableSlots,
    loading,
    error,
    lastRefreshTime,
    refreshSlots
  } = useAvailableSlots({
    merchantId: merchantId || '',
    selectedDate,
    selectedStaff,
    totalDuration
  });

  // Slot locking functionality with atomic multi-slot support
  const { lockSlot, releaseSlot, isLocking } = useSlotLocking();

  // Real-time slot updates
  useRealtimeSlots({
    selectedDate,
    selectedStaff,
    merchantId: merchantId || '',
    onSlotChange: refreshSlots,
    selectedTime,
    onSelectedTimeInvalidated: () => {
      setSelectedTime('');
      setLockedSlotInfo(null);
      toast.info('Selected time slot is no longer available');
    }
  });

  // Cleanup: Release locked slots when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      if (lockedSlotInfo) {
        console.log('🔓 Cleaning up locked slots on unmount');
        releaseSlot(
          lockedSlotInfo.staffId,
          lockedSlotInfo.date,
          lockedSlotInfo.time,
          lockedSlotInfo.duration
        );
      }
    };
  }, [lockedSlotInfo, releaseSlot]);

  const handleSlotClick = async (timeSlot: string) => {
    if (isLocking || isCheckingSlot) return;
    
    // If user selects a different slot, release the previous lock first
    if (lockedSlotInfo && lockedSlotInfo.time !== timeSlot) {
      console.log('🔄 Releasing previous slot lock before selecting new one');
      await releaseSlot(
        lockedSlotInfo.staffId,
        lockedSlotInfo.date,
        lockedSlotInfo.time,
        lockedSlotInfo.duration
      );
      setLockedSlotInfo(null);
      setSelectedTime('');
    }
    
    setIsCheckingSlot(true);
    
    try {
      console.log('🎯 Attempting to lock slot:', {
        timeSlot,
        totalDuration,
        staff: selectedStaff
      });

      // Attempt atomic multi-slot lock
      const success = await lockSlot(
        selectedStaff,
        formatDateInIST(selectedDate, 'yyyy-MM-dd'),
        timeSlot,
        totalDuration
      );
      
      if (success) {
        setSelectedTime(timeSlot);
        setLockedSlotInfo({
          staffId: selectedStaff,
          date: formatDateInIST(selectedDate, 'yyyy-MM-dd'),
          time: timeSlot,
          duration: totalDuration
        });
        toast.success(`Time slot reserved for ${totalDuration} minutes`);
      } else {
        // Refresh slots to show current availability
        refreshSlots();
        toast.error('This time slot is not available for the selected duration');
      }
    } catch (error) {
      console.error('❌ Error selecting slot:', error);
      toast.error('Failed to select time slot');
      refreshSlots();
    } finally {
      setIsCheckingSlot(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedTime || !lockedSlotInfo) {
      toast.error('Please select a time slot');
      return;
    }

    // Don't release the lock here - it will be released after successful booking
    // or when the user navigates back
    navigate(`/customer/merchant/${merchantId}/payment`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff,
        selectedStaffDetails,
        bookingDate: formatDateInIST(selectedDate, 'yyyy-MM-dd'),
        bookingTime: selectedTime,
        lockedSlotInfo // Pass this to payment page for proper cleanup
      }
    });
  };

  const handleGoBack = async () => {
    // Release any locked slots before going back
    if (lockedSlotInfo) {
      console.log('🔓 Releasing locked slots before navigation');
      await releaseSlot(
        lockedSlotInfo.staffId,
        lockedSlotInfo.date,
        lockedSlotInfo.time,
        lockedSlotInfo.duration
      );
    }
    navigate(-1);
  };

  // Calculate next valid slot time for today
  const getNextValidSlotTime = () => {
    if (!isTodayIST(selectedDate)) return null;
    
    const availableSlotsForToday = availableSlots.filter(slot => slot.is_available);
    if (availableSlotsForToday.length === 0) return null;
    
    const sortedSlots = availableSlotsForToday.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    return sortedSlots[0]?.time_slot || null;
  };

  const nextValidSlotTime = getNextValidSlotTime();

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
            onClick={handleGoBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium font-righteous">Select Date & Time</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Service Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous text-lg font-light">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="font-poppins text-gray-600">Services</span>
              <div className="text-right">
                {selectedServices?.map((service: any, index: number) => (
                  <div key={index} className="font-poppins font-medium">
                    {service.name} ({service.duration}min)
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="font-poppins text-gray-600">Total Duration</span>
              <span className="font-poppins font-medium">{totalDuration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="font-poppins text-gray-600">Stylist</span>
              <span className="font-poppins font-medium">{selectedStaffDetails?.name}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span className="font-righteous">Total</span>
              <span className="font-righteous">₹{totalPrice}</span>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous text-lg font-light flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  // Release any current locks when changing date
                  if (lockedSlotInfo) {
                    releaseSlot(
                      lockedSlotInfo.staffId,
                      lockedSlotInfo.date,
                      lockedSlotInfo.time,
                      lockedSlotInfo.duration
                    );
                    setLockedSlotInfo(null);
                  }
                  setSelectedDate(date);
                  setSelectedTime('');
                }
              }}
              disabled={(date) => date < getCurrentDateIST()}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Time Slot Selection */}
        <Card>
          <CardContent className="pt-6">
            <SlotSelector
              selectedDate={selectedDate}
              availableSlots={availableSlots}
              selectedTime={selectedTime}
              loading={loading}
              error={error}
              lastRefreshTime={lastRefreshTime}
              nextValidSlotTime={nextValidSlotTime}
              isCheckingSlot={isCheckingSlot}
              onSlotClick={handleSlotClick}
              onRefresh={refreshSlots}
              totalDuration={totalDuration}
            />
          </CardContent>
        </Card>

        {/* Duration Notice */}
        {totalDuration > 10 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-blue-800 text-sm font-poppins">
                ℹ️ Your selected services require {totalDuration} minutes. We reserve all required time slots to ensure availability.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Slot Lock Status */}
        {lockedSlotInfo && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-green-800 text-sm font-poppins">
                ✅ Time slot {formatTimeToAmPm(lockedSlotInfo.time)} is temporarily reserved for you
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedTime || isLocking || isCheckingSlot || !lockedSlotInfo}
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 py-6 font-poppins font-semibold text-base"
        >
          {isLocking || isCheckingSlot ? 'Reserving slot...' : 
           selectedTime ? `Continue with ${formatTimeToAmPm(selectedTime)}` : 
           'Select a time slot to continue'}
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
