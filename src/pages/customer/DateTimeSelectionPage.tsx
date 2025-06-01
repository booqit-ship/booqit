
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Clock, ChevronLeft, MapPin, Star, CalendarIcon } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { toast } from 'sonner';
import { addDays, format, isSameDay } from 'date-fns';

interface SlotData {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  slot_status: 'Available' | 'Shop Closed' | 'Stylist not available' | 'Booked';
  status_reason: string | null;
}

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userId } = useAuth();
  
  const { 
    merchant, 
    selectedServices, 
    totalPrice, 
    totalDuration, 
    selectedStaff, 
    selectedStaffDetails 
  } = location.state || {};

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<SlotData[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<'date' | 'time'>('date');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (!merchantId || !merchant || !selectedServices) {
      console.error('Missing required state in DateTimeSelectionPage');
      navigate(`/merchant/${merchantId}`);
      return;
    }
  }, [merchantId, isAuthenticated, merchant, selectedServices, navigate]);

  const fetchAvailableSlots = async (date: Date) => {
    if (!merchantId) return;
    
    setLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      console.log('Fetching slots for date:', dateStr);

      const { data: slotData, error } = await supabase.rpc('get_dynamic_available_slots', {
        p_merchant_id: merchantId,
        p_date: dateStr,
        p_staff_id: selectedStaff || null
      });

      if (error) {
        console.error('Error fetching slots:', error);
        throw error;
      }

      const formattedSlots: SlotData[] = (slotData || []).map((slot: any) => ({
        staff_id: slot.staff_id,
        staff_name: slot.staff_name,
        time_slot: slot.time_slot,
        slot_status: slot.slot_status as SlotData['slot_status'],
        status_reason: slot.status_reason
      }));

      // Filter available slots only
      const availableOnly = formattedSlots.filter(slot => slot.slot_status === 'Available');
      setAvailableSlots(availableOnly);
      
      console.log('Available slots:', availableOnly);
    } catch (error: any) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to load available time slots');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSelectedTime('');
      fetchAvailableSlots(date);
      setStep('time');
    }
  };

  const handleTimeSelect = (timeSlot: string) => {
    setSelectedTime(timeSlot);
  };

  const handleContinueToPayment = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time');
      return;
    }

    const bookingDate = format(selectedDate, 'yyyy-MM-dd');
    
    navigate(`/payment/${merchantId}`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff,
        selectedStaffDetails,
        bookingDate,
        bookingTime: selectedTime
      }
    });
  };

  const handleBack = () => {
    if (step === 'time') {
      setStep('date');
      setSelectedTime('');
    } else {
      navigate(`/booking/${merchantId}/staff`, {
        state: {
          merchant,
          selectedServices,
          totalPrice,
          totalDuration
        }
      });
    }
  };

  // Don't allow past dates
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  if (!merchant || !selectedServices) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Session expired. Please start again.</p>
          <Button onClick={() => navigate(`/merchant/${merchantId}`)}>
            Back to Merchant
          </Button>
        </div>
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
            onClick={handleBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">
            {step === 'date' ? 'Select Date' : 'Select Time'}
          </h1>
        </div>
      </div>

      <div className="p-4">
        {/* Merchant & Service Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-booqit-primary" />
              <h1 className="text-lg font-bold">{merchant.shop_name}</h1>
              {merchant.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm">{merchant.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 mb-3">{merchant.address}</p>
            
            <div className="bg-booqit-primary/5 p-3 rounded-lg">
              <div className="space-y-2">
                {selectedServices.map((service: any) => (
                  <div key={service.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        <span>{service.duration} mins</span>
                      </div>
                    </div>
                    <div className="text-booqit-primary font-semibold">
                      ₹{service.price}
                    </div>
                  </div>
                ))}
                {selectedStaffDetails && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                    <span>Stylist: {selectedStaffDetails.name}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span className="text-booqit-primary">₹{totalPrice}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection Step */}
        {step === 'date' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Choose Date
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                fromDate={new Date()}
                toDate={addDays(new Date(), 30)}
                className="w-full flex justify-center"
              />
            </CardContent>
          </Card>
        )}

        {/* Time Selection Step */}
        {step === 'time' && selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Available Times - {format(selectedDate, 'MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSlots ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-booqit-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading available times...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No available time slots for this date</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setStep('date')}
                  >
                    Choose Different Date
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableSlots.map((slot, index) => {
                    const isSelected = selectedTime === slot.time_slot;
                    
                    return (
                      <Button
                        key={`${slot.staff_id}-${slot.time_slot}-${index}`}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => handleTimeSelect(slot.time_slot)}
                        className="h-auto p-3 flex flex-col items-center"
                      >
                        <div className="text-sm font-medium">
                          {formatTimeToAmPm(slot.time_slot)}
                        </div>
                        <div className="text-xs opacity-75 mt-1">
                          {slot.staff_name}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Continue Button */}
      {step === 'time' && selectedTime && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <Button
            onClick={handleContinueToPayment}
            className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
            size="lg"
          >
            Continue to Payment - ₹{totalPrice}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DateTimeSelectionPage;
