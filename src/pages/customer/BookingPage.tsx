
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, CalendarIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { useSlotGeneration } from '@/hooks/useSlotGeneration';

const BookingPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration, selectedStaff, selectedStaffDetails } = location.state;

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [conflictMessage, setConflictMessage] = useState<string>('');

  const { slots, loading, error } = useSlotGeneration(merchantId!, selectedStaff);

  useEffect(() => {
    // Auto-select today if available
    if (slots.length > 0 && !selectedDate) {
      setSelectedDate(slots[0].date);
    }
  }, [slots]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setSelectedStaffId('');
    setConflictMessage('');
  };

  const handleTimeSlotClick = (slot: any) => {
    if (slot.slot_status !== 'Available') {
      setConflictMessage(slot.status_reason || `Slot is ${slot.slot_status.toLowerCase()}`);
      setSelectedTime('');
      setSelectedStaffId('');
      return;
    }
    
    setSelectedTime(slot.time_slot);
    setSelectedStaffId(slot.staff_id);
    setConflictMessage('');
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime || !selectedStaffId) {
      toast.error('Please select date, time, and available slot');
      return;
    }

    const finalStaffId = selectedStaff || selectedStaffId;
    const finalStaffDetails = selectedStaffDetails || { 
      name: slots.find(day => day.date === selectedDate)?.slots.find(slot => slot.staff_id === selectedStaffId)?.staff_name 
    };

    navigate(`/payment/${merchantId}`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff: finalStaffId,
        selectedStaffDetails: finalStaffDetails,
        bookingDate: selectedDate,
        bookingTime: selectedTime
      }
    });
  };

  const selectedDaySlots = slots.find(day => day.date === selectedDate);
  const availableSlots = selectedDaySlots?.slots.filter(slot => slot.slot_status === 'Available') || [];
  const unavailableSlots = selectedDaySlots?.slots.filter(slot => slot.slot_status !== 'Available') || [];

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
            Select your preferred date and time slot. Service duration: {totalDuration} minutes
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Booking available for today, tomorrow, and the day after only
          </p>
        </div>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6">
          <h3 className="font-medium mb-3 flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Select Date
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {slots.map((daySlot) => {
              const isSelected = selectedDate === daySlot.date;
              
              return (
                <Button
                  key={daySlot.date}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-auto p-3 flex flex-col items-center space-y-1 ${
                    isSelected ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                  }`}
                  onClick={() => handleDateSelect(daySlot.date)}
                >
                  <div className="text-xs font-medium">
                    {daySlot.displayDate}
                  </div>
                  <div className="text-lg font-bold">
                    {format(new Date(daySlot.date), 'd')}
                  </div>
                  <div className="text-xs opacity-70">
                    {format(new Date(daySlot.date), 'MMM')}
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
              Available Time Slots
            </h3>
            
            {conflictMessage && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {conflictMessage}
                </AlertDescription>
              </Alert>
            )}
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot, index) => (
                    <Button
                      key={`${slot.staff_id}-${slot.time_slot}-${index}`}
                      variant={selectedTime === slot.time_slot && selectedStaffId === slot.staff_id ? "default" : "outline"}
                      className={`p-3 flex flex-col ${
                        selectedTime === slot.time_slot && selectedStaffId === slot.staff_id ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                      }`}
                      onClick={() => handleTimeSlotClick(slot)}
                    >
                      <span className="font-medium text-xs">{formatTimeToAmPm(slot.time_slot)}</span>
                      <span className="text-xs opacity-70">{slot.staff_name}</span>
                    </Button>
                  ))}
                </div>
                
                {unavailableSlots.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Unavailable slots:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {unavailableSlots.slice(0, 6).map((slot, index) => (
                        <Button
                          key={`unavailable-${slot.staff_id}-${slot.time_slot}-${index}`}
                          variant="outline"
                          className="p-3 opacity-50 cursor-not-allowed bg-gray-100 flex flex-col"
                          onClick={() => handleTimeSlotClick(slot)}
                          disabled={false}
                        >
                          <span className="font-medium text-gray-500 text-xs">{formatTimeToAmPm(slot.time_slot)}</span>
                          <span className="text-xs text-gray-400">{slot.slot_status}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No available time slots</p>
                <p className="text-gray-400 text-sm">
                  {selectedDaySlots?.slots[0]?.slot_status === 'Shop Closed' 
                    ? 'Shop is closed on this date' 
                    : 'All stylists are unavailable'}
                </p>
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
          disabled={!selectedDate || !selectedTime || !selectedStaffId}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default BookingPage;
