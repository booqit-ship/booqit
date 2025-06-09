
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Package, User } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';

interface ServiceSelection {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface Staff {
  id: string;
  name: string;
}

interface TimeSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason?: string;
}

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const state = location.state;
    if (!state?.selectedServices || !state?.selectedStaff || !state?.merchantData) {
      toast.error('Missing booking information');
      navigate(`/service-selection/${merchantId}`);
      return;
    }
    
    setSelectedServices(state.selectedServices);
    setSelectedStaff(state.selectedStaff);
    setMerchantData(state.merchantData);
  }, [location.state, merchantId, navigate]);

  const fetchAvailableSlots = async (date: Date) => {
    if (!selectedStaff) return;
    
    setLoading(true);
    try {
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: merchantId,
        p_date: dateStr,
        p_staff_id: selectedStaff.id,
        p_service_duration: totalDuration
      });

      if (error) {
        console.error('Error fetching slots:', error);
        toast.error('Failed to load available time slots');
        return;
      }

      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTimeSlot('');
    if (date) {
      fetchAvailableSlots(date);
    }
  };

  const handleTimeSlotSelect = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Please select both date and time');
      return;
    }

    const bookingData = {
      merchantId,
      merchantName: merchantData.shop_name,
      merchantAddress: merchantData.address,
      staffId: selectedStaff!.id,
      staffName: selectedStaff!.name,
      services: selectedServices,
      date: format(selectedDate, 'yyyy-MM-dd'),
      timeSlot: selectedTimeSlot,
    };

    navigate('/booking-summary', { state: { bookingData } });
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, service) => sum + service.price, 0);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((sum, service) => sum + service.duration, 0);
  };

  const availableTimeSlots = availableSlots.filter(slot => slot.is_available);

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-light mb-2">Select Date & Time</h1>
        <p className="text-gray-600">{merchantData?.shop_name}</p>
      </div>

      {/* Booking Summary */}
      <Card className="mb-6 border-booqit-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Stylist: {selectedStaff?.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Total duration: {getTotalDuration()} minutes</span>
          </div>
          
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center font-semibold">
              <span>Total Price:</span>
              <span className="text-booqit-primary">₹{getTotalPrice()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Selection */}
      <Card className="mb-6">
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
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date() || date < new Date(Date.now() - 86400000)}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Time Selection */}
      {selectedDate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Times - {format(selectedDate, 'MMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-booqit-primary"></div>
              </div>
            ) : availableTimeSlots.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No available time slots for this date</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableTimeSlots.map((slot) => (
                  <Button
                    key={slot.time_slot}
                    variant={selectedTimeSlot === slot.time_slot ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeSlotSelect(slot.time_slot)}
                    className={selectedTimeSlot === slot.time_slot ? "bg-booqit-primary" : ""}
                  >
                    {formatTimeToAmPm(slot.time_slot)}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <Button
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTimeSlot}
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
          size="lg"
        >
          Continue to Summary
        </Button>
        
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
