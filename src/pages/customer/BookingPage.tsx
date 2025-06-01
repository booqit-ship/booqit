
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSlotGeneration } from '@/hooks/useSlotGeneration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Calendar, MapPin, Star } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  image_url?: string;
}

interface Merchant {
  id: string;
  shop_name: string;
  address: string;
  rating?: number;
  image_url?: string;
}

interface Staff {
  id: string;
  name: string;
}

const BookingPage: React.FC = () => {
  const { merchantId, serviceId } = useParams<{ merchantId: string; serviceId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, userId } = useAuth();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { slots, loading: slotsLoading, error: slotsError, refreshSlots } = useSlotGeneration(
    merchantId || '', 
    selectedStaff || undefined
  );

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (!merchantId || !serviceId) {
      navigate('/');
      return;
    }

    fetchData();
  }, [merchantId, serviceId, isAuthenticated]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch merchant details
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (merchantError) throw merchantError;
      setMerchant(merchantData);

      // Fetch service details
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (serviceError) throw serviceError;
      setService(serviceData);

      // Fetch staff for this merchant
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('merchant_id', merchantId);

      if (staffError) throw staffError;
      setStaff(staffData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedStaff || !selectedDate || !selectedTime || !service || !userId) {
      toast.error('Please select all required fields');
      return;
    }

    setIsBooking(true);
    
    try {
      // Create the booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          merchant_id: merchantId!,
          service_id: serviceId!,
          staff_id: selectedStaff,
          date: selectedDate,
          time_slot: selectedTime,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Book the stylist slot
      const { data: slotResult, error: slotError } = await supabase.rpc('book_stylist_slot', {
        p_staff_id: selectedStaff,
        p_date: selectedDate,
        p_time_slot: selectedTime,
        p_booking_id: bookingData.id,
        p_service_duration: service.duration
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

      toast.success('Booking created successfully!');
      navigate(`/booking-summary/${bookingData.id}`);

    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  if (!merchant || !service) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Service not found</h1>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      {/* Merchant & Service Info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-booqit-primary" />
                <h1 className="text-xl font-bold">{merchant.shop_name}</h1>
                {merchant.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm">{merchant.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 mb-4">{merchant.address}</p>
              
              <div className="bg-booqit-primary/5 p-4 rounded-lg">
                <h2 className="font-semibold mb-2">{service.name}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} mins</span>
                  </div>
                  <div className="font-semibold text-booqit-primary">
                    ₹{service.price}
                  </div>
                </div>
                {service.description && (
                  <p className="text-sm text-gray-600 mt-2">{service.description}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Selection */}
      {staff.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Stylist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {staff.map((stylist) => (
                <Button
                  key={stylist.id}
                  variant={selectedStaff === stylist.id ? "default" : "outline"}
                  onClick={() => setSelectedStaff(stylist.id)}
                  className="justify-start h-auto p-3"
                >
                  {stylist.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Slot Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date & Time
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
                                if (!selectedStaff) {
                                  setSelectedStaff(slot.staff_id);
                                }
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

      {/* Booking Summary & Confirm */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span>Service:</span>
              <span className="font-medium">{service.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{service.duration} minutes</span>
            </div>
            {selectedStaff && (
              <div className="flex justify-between">
                <span>Stylist:</span>
                <span>{staff.find(s => s.id === selectedStaff)?.name}</span>
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
              <span>₹{service.price}</span>
            </div>
          </div>
          
          <Button
            onClick={handleBooking}
            disabled={!selectedStaff || !selectedDate || !selectedTime || isBooking}
            className="w-full"
            size="lg"
          >
            {isBooking ? 'Creating Booking...' : 'Book Now'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingPage;
