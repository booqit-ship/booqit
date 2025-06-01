
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSlotGeneration } from '@/hooks/useSlotGeneration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Calendar, ChevronLeft, MapPin, Star } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { toast } from 'sonner';

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

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);

  const { slots, loading: slotsLoading, error: slotsError } = useSlotGeneration(
    merchantId || '', 
    selectedStaff || undefined
  );

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

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !userId) {
      toast.error('Please select date and time');
      return;
    }

    if (!selectedServices || selectedServices.length === 0) {
      toast.error('No services selected');
      return;
    }

    setIsBooking(true);
    
    try {
      // For now, we'll book the first service. In a full implementation,
      // you might want to handle multiple services differently
      const firstService = selectedServices[0];
      
      // Create the booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          merchant_id: merchantId!,
          service_id: firstService.id,
          staff_id: selectedStaff,
          date: selectedDate,
          time_slot: selectedTime,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Book the stylist slot if we have a specific staff member
      if (selectedStaff) {
        const { data: slotResult, error: slotError } = await supabase.rpc('book_stylist_slot', {
          p_staff_id: selectedStaff,
          p_date: selectedDate,
          p_time_slot: selectedTime,
          p_booking_id: bookingData.id,
          p_service_duration: totalDuration || firstService.duration
        });

        if (slotError) {
          // If slot booking fails, delete the booking
          await supabase.from('bookings').delete().eq('id', bookingData.id);
          throw slotError;
        }

        const result = slotResult as any;
        if (!result.success) {
          // If slot booking fails, delete the booking
          await supabase.from('bookings').delete().eq('id', bookingData.id);
          throw new Error(result.error || 'Failed to book time slot');
        }
      }

      toast.success('Booking created successfully!');
      navigate(`/booking/${merchantId}/summary`, {
        state: {
          bookingId: bookingData.id,
          merchant,
          selectedServices,
          totalPrice,
          selectedDate,
          selectedTime,
          selectedStaffDetails
        }
      });

    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setIsBooking(false);
    }
  };

  const handleBack = () => {
    navigate(`/booking/${merchantId}/staff`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration
      }
    });
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
          <h1 className="text-xl font-medium">Select Date & Time</h1>
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
                    <User className="h-3 w-3" />
                    <span>Stylist: {selectedStaffDetails.name}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Slot Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Available Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slotsError && (
              <div className="text-red-600 mb-4">
                Error loading slots: {slotsError}
              </div>
            )}
            
            {slotsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-booqit-primary mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading available times...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {slots.map((daySlots) => (
                  <div key={daySlots.date}>
                    <h3 className="font-semibold mb-3">{daySlots.displayDate}</h3>
                    
                    {daySlots.slots.length === 0 ? (
                      <p className="text-gray-500 italic">No slots available</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {daySlots.slots.map((slot, index) => {
                          const isSelected = selectedDate === daySlots.date && selectedTime === slot.time_slot;
                          const isAvailable = slot.slot_status === 'Available';
                          
                          return (
                            <Button
                              key={`${slot.staff_id}-${slot.time_slot}-${index}`}
                              variant={isSelected ? "default" : "outline"}
                              disabled={!isAvailable || isBooking}
                              onClick={() => {
                                if (isAvailable) {
                                  setSelectedDate(daySlots.date);
                                  setSelectedTime(slot.time_slot);
                                }
                              }}
                              className="h-auto p-2 flex flex-col items-center"
                            >
                              <div className="text-sm font-medium">
                                {formatTimeToAmPm(slot.time_slot)}
                              </div>
                              <div className="text-xs opacity-75">
                                {slot.staff_name}
                              </div>
                              {!isAvailable && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {slot.slot_status}
                                </Badge>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Services:</span>
                <span className="font-medium">{selectedServices.length} service(s)</span>
              </div>
              <div className="flex justify-between">
                <span>Total Duration:</span>
                <span>{totalDuration} minutes</span>
              </div>
              {selectedStaffDetails && (
                <div className="flex justify-between">
                  <span>Stylist:</span>
                  <span>{selectedStaffDetails.name}</span>
                </div>
              )}
              {selectedDate && selectedTime && (
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>
                    {selectedDate} at {formatTimeToAmPm(selectedTime)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total:</span>
                <span>₹{totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button
          onClick={handleBooking}
          disabled={!selectedDate || !selectedTime || isBooking}
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
        >
          {isBooking ? 'Creating Booking...' : 'Book Now'}
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
