
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  ChevronLeft, 
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { Merchant, Service, Staff } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
}

const BookingPage: React.FC = () => {
  const { merchantId, serviceId } = useParams<{ merchantId: string, serviceId: string }>();
  const navigate = useNavigate();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Booking state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  
  // Time slots generation
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  useEffect(() => {
    const fetchMerchantAndService = async () => {
      try {
        setLoading(true);
        if (!merchantId || !serviceId) return;
        
        // Fetch merchant details
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', merchantId)
          .single();
          
        if (merchantError) throw merchantError;
        
        // Fetch service details
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .eq('merchant_id', merchantId)
          .single();
          
        if (serviceError) throw serviceError;
        
        // Fetch staff for this merchant that are assigned to this service
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId)
          .contains('assigned_service_ids', [serviceId]);
          
        if (staffError) throw staffError;
        
        setMerchant(merchantData);
        setService(serviceData);
        setStaff(staffData || []);

        // Generate time slots between merchant's open and close time
        if (merchantData && selectedDate) {
          generateTimeSlots(merchantData.open_time, merchantData.close_time, serviceData.duration);
        }
      } catch (error) {
        console.error('Error fetching details:', error);
        toast.error('Could not load booking details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMerchantAndService();
  }, [merchantId, serviceId]);

  // Regenerate time slots when date changes
  useEffect(() => {
    if (merchant && selectedDate && service) {
      generateTimeSlots(merchant.open_time, merchant.close_time, service.duration);
    }
  }, [selectedDate, merchant, service]);

  // Generate available time slots based on opening hours and service duration
  const generateTimeSlots = (openTime: string, closeTime: string, duration: number) => {
    const slots: TimeSlot[] = [];
    
    try {
      // Convert opening and closing times to minutes since midnight
      const openMinutes = convertTimeToMinutes(openTime);
      const closeMinutes = convertTimeToMinutes(closeTime);
      
      // Create slots in service duration intervals
      let currentMinute = openMinutes;
      while (currentMinute + duration <= closeMinutes) {
        const hour = Math.floor(currentMinute / 60);
        const minute = currentMinute % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        slots.push({ 
          time: timeString, 
          available: true // In a real app, check against existing bookings
        });
        
        currentMinute += duration; // Move to next slot based on service duration
      }

      // Check for existing bookings
      if (selectedDate) {
        checkBookedSlots(slots, selectedDate.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Error generating time slots:', error);
      toast.error('Could not generate time slots');
    }
    
    setTimeSlots(slots);
  };

  const checkBookedSlots = async (slots: TimeSlot[], dateString: string) => {
    try {
      // Fetch existing bookings for this date and merchant
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('date', dateString);
      
      if (error) throw error;
      
      // Mark slots as unavailable if already booked
      const updatedSlots = slots.map(slot => {
        const isBooked = bookings?.some(booking => 
          booking.time_slot === slot.time && 
          booking.status !== 'cancelled'
        );
        return { ...slot, available: !isBooked };
      });
      
      setTimeSlots(updatedSlots);
    } catch (error) {
      console.error('Error checking booked slots:', error);
    }
  };

  const convertTimeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Please select a date and time slot');
      return;
    }

    if (staff.length > 0 && !selectedStaff) {
      toast.error('Please select a stylist');
      return;
    }

    // Navigate to payment page with booking details
    navigate(`/payment/${merchantId}/${serviceId}`, {
      state: {
        bookingDate: selectedDate.toISOString().split('T')[0],
        bookingTime: selectedTimeSlot,
        staffId: selectedStaff,
        serviceName: service?.name,
        servicePrice: service?.price,
        merchantName: merchant?.shop_name
      }
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!merchant || !service) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Service or merchant not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="relative bg-booqit-primary text-white p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 text-white hover:bg-white/20"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-center text-xl font-medium">Book Appointment</h1>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Service and Merchant Info */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold">{service.name}</h2>
            <div className="flex justify-between text-sm mt-1">
              <span>{merchant.shop_name}</span>
              <span className="font-medium">₹{service.price}</span>
            </div>
            <div className="flex text-gray-500 text-sm mt-2">
              <Clock className="h-4 w-4 mr-1" />
              <span>{service.duration} mins</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Staff Selection */}
        {staff.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-2">Choose Stylist</h2>
            <Select
              value={selectedStaff || ''}
              onValueChange={setSelectedStaff}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a stylist" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 opacity-70" />
                      {person.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Date Selection */}
        <div>
          <h2 className="text-lg font-medium mb-2">Select Date</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => 
                  date < new Date() ||
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Time Slots */}
        <div>
          <h2 className="text-lg font-medium mb-2">Select Time</h2>
          {timeSlots.length > 0 ? (
            <RadioGroup
              value={selectedTimeSlot || ''}
              onValueChange={setSelectedTimeSlot}
            >
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((slot) => (
                  <div key={slot.time}>
                    <label
                      className={`flex items-center justify-center px-4 py-2 rounded-md border text-sm cursor-pointer ${
                        slot.available 
                          ? selectedTimeSlot === slot.time
                            ? 'bg-booqit-primary text-white'
                            : 'bg-white hover:bg-gray-50'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <RadioGroupItem
                        value={slot.time}
                        disabled={!slot.available}
                        className="sr-only"
                      />
                      <span>{slot.time}</span>
                    </label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <p className="text-center py-4 bg-gray-50 rounded-md text-gray-500">
              No available time slots for the selected date
            </p>
          )}
        </div>
        
        <Separator />
        
        {/* Summary */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Service</span>
            <span className="font-medium">{service.name}</span>
          </div>
          {selectedStaff && staff.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Stylist</span>
              <span className="font-medium">
                {staff.find(s => s.id === selectedStaff)?.name || 'Not selected'}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Date & Time</span>
            <span className="font-medium">
              {selectedDate 
                ? `${format(selectedDate, 'PP')} at ${selectedTimeSlot || '--:--'}` 
                : 'Not selected'}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-medium">
            <span>Total</span>
            <span>₹{service.price}</span>
          </div>
        </div>
        
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
          size="lg"
          onClick={handleContinue}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default BookingPage;
