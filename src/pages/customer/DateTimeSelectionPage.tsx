import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { useRealtimeSlots } from '@/hooks/useRealtimeSlots';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useAtomicBookingHandler } from '@/components/customer/AtomicBookingHandler';

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  
  const { createConfirmedBooking, isBooking } = useAtomicBookingHandler();
  
  const {
    merchant,
    selectedServices,
    totalPrice,
    totalDuration,
    selectedStaff,
    selectedStaffDetails
  } = location.state || {};

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isCheckingSlot, setIsCheckingSlot] = useState(false);
  const [lockedSlotInfo, setLockedSlotInfo] = useState<any>(null);

  const actualServiceDuration = totalDuration || selectedServices?.reduce((sum: number, service: any) => sum + (service.duration || 0), 0) || 30;

  const { availableSlots, loading, refreshSlots } = useAvailableSlots({
    merchantId: merchantId || '',
    selectedDate,
    selectedStaff,
    totalDuration: actualServiceDuration
  });

  const handleSelectedTimeInvalidated = useCallback(() => {
    setSelectedTime('');
    setLockedSlotInfo(null);
    toast.info('Please select a new time slot');
  }, []);

  useRealtimeSlots({
    selectedDate,
    selectedStaff,
    merchantId: merchantId || '',
    onSlotChange: refreshSlots,
    selectedTime,
    onSelectedTimeInvalidated: handleSelectedTimeInvalidated
  });

  useEffect(() => {
    return () => {
      if (lockedSlotInfo && !isBooking) {
        console.log('🔓 Releasing locked slots from cleanup');
        // Cleanup handled by AtomicBookingHandler
      }
    };
  }, [lockedSlotInfo, isBooking]);

  const handleTimeSlotClick = async (timeSlot: string) => {
    if (!selectedDate || !merchantId || !userId) return;
    
    const selectedSlot = availableSlots.find(slot => slot.time_slot === timeSlot);
    if (!selectedSlot || !selectedSlot.is_available) {
      toast.error('This slot is not available');
      return;
    }
    
    setSelectedTime(timeSlot);
    setLockedSlotInfo({
      staffId: selectedStaff || selectedSlot.staff_id,
      date: formatDateInIST(selectedDate, 'yyyy-MM-dd'),
      time: timeSlot,
      duration: actualServiceDuration
    });
    
    toast.success(`Time slot selected for ${actualServiceDuration} minutes!`);
  };

  const handleContinue = async () => {
    if (!selectedDate || !selectedTime || !userId) {
      toast.error('Please select a time slot first');
      return;
    }

    const selectedSlot = availableSlots.find(slot => slot.time_slot === selectedTime);
    if (!selectedSlot) {
      toast.error('Selected time slot information not found');
      return;
    }

    try {
      const finalStaffId = selectedStaff || selectedSlot.staff_id;
      const finalStaffDetails = selectedStaffDetails || { name: selectedSlot.staff_name };

      console.log('🚀 Creating confirmed booking directly...');
      
      const bookingResult = await createConfirmedBooking({
        userId,
        merchantId: merchantId!,
        selectedServices,
        selectedStaff: finalStaffId,
        selectedStaffDetails: finalStaffDetails,
        selectedDate,
        selectedTime,
        totalDuration: actualServiceDuration,
        totalPrice
      });

      if (!bookingResult.success) {
        toast.error(bookingResult.error || 'Failed to create booking');
        refreshSlots();
        return;
      }

      console.log('✅ Booking created successfully, proceeding to payment');
      
      // Navigate to payment page with confirmed booking
      navigate(`/payment/${merchantId}`, {
        state: {
          merchant,
          selectedServices,
          totalPrice,
          totalDuration: actualServiceDuration,
          selectedStaff: finalStaffId,
          selectedStaffDetails: finalStaffDetails,
          bookingDate: formatDateInIST(selectedDate, 'yyyy-MM-dd'),
          bookingTime: selectedTime,
          bookingId: bookingResult.bookingId
        }
      });

    } catch (error) {
      console.error('❌ Error proceeding to payment:', error);
      toast.error('Error proceeding to payment. Please try again.');
      refreshSlots();
    }
  };

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 30);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedTime('');
    setLockedSlotInfo(null);
  };

  if (!selectedServices || !merchantId) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Service information missing</p>
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
          <h1 className="text-xl font-medium font-righteous">Select Date & Time</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Service Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous text-lg font-light">Selected Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedServices.map((service: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span className="font-poppins">{service.name}</span>
                <div className="text-right">
                  <span className="font-poppins font-medium">₹{service.price}</span>
                  <span className="text-sm text-gray-500 ml-2">({service.duration}min)</span>
                </div>
              </div>
            ))}
            <hr className="my-2" />
            <div className="flex justify-between items-center font-semibold">
              <span className="font-righteous">Total</span>
              <div className="text-right">
                <span className="font-righteous">₹{totalPrice}</span>
                <span className="text-sm text-gray-500 ml-2">({actualServiceDuration}min)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Info */}
        {selectedStaffDetails && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-booqit-primary" />
                <div>
                  <p className="font-poppins font-medium">Selected Stylist</p>
                  <p className="text-sm text-gray-600">{selectedStaffDetails.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous text-lg font-light flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarComponent
              mode="single"
              selected={selectedDate || undefined}
              onSelect={handleDateSelect}
              disabled={(date) => date < today || date > maxDate}
              className="rounded-md border w-full"
            />
          </CardContent>
        </Card>

        {/* Time Slot Selection */}
        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="font-righteous text-lg font-light flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Available Time Slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading available slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No available slots for this date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {availableSlots
                    .filter(slot => slot.is_available)
                    .map((slot) => (
                      <Button
                        key={`${slot.staff_id}-${slot.time_slot}`}
                        variant={selectedTime === slot.time_slot ? "default" : "outline"}
                        className={`h-auto py-3 px-2 ${
                          selectedTime === slot.time_slot 
                            ? 'bg-booqit-primary hover:bg-booqit-primary/90' 
                            : 'hover:bg-booqit-primary/10'
                        }`}
                        onClick={() => handleTimeSlotClick(slot.time_slot)}
                        disabled={isCheckingSlot}
                      >
                        <div className="text-center w-full">
                          <div className="font-poppins text-sm">
                            {formatTimeToAmPm(slot.time_slot)}
                          </div>
                          {!selectedStaff && (
                            <div className="text-xs opacity-80 mt-1">
                              {slot.staff_name}
                            </div>
                          )}
                        </div>
                      </Button>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selected Time Display */}
        {selectedTime && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="font-poppins font-medium text-green-800">
                  Selected: {formatDateInIST(selectedDate!, 'MMM d, yyyy')} at {formatTimeToAmPm(selectedTime)}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Duration: {actualServiceDuration} minutes
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedTime || isBooking}
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 py-6 font-poppins font-semibold text-base"
        >
          {isBooking ? 'Creating Booking...' : 'Continue to Payment'}
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
