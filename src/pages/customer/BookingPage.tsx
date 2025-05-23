
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, isBefore, startOfToday } from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  ChevronLeft,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Merchant, Service, Staff } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DateOption {
  date: Date;
  label: string;
  day: string;
}

const BookingPage: React.FC = () => {
  const { merchantId, serviceId } = useParams<{ merchantId: string, serviceId: string }>();
  const navigate = useNavigate();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Booking state
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  
  // Available dates (today + 6 days)
  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  
  // Time slots generation
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Generate available dates (today + next 6 days)
  useEffect(() => {
    const today = startOfToday();
    const dates: DateOption[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const day = format(date, 'EEE').toUpperCase();
      const label = format(date, 'MMM d');
      
      dates.push({
        date,
        day,
        label
      });
    }
    
    setAvailableDates(dates);
  }, []);

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

        // Generate time slots for today initially
        if (merchantData && availableDates.length > 0) {
          generateTimeSlots(merchantData.open_time, merchantData.close_time, serviceData.duration, availableDates[0].date);
        }
      } catch (error) {
        console.error('Error fetching details:', error);
        toast.error('Could not load booking details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMerchantAndService();
  }, [merchantId, serviceId, availableDates.length]);

  // Regenerate time slots when date changes
  useEffect(() => {
    if (merchant && service && availableDates.length > 0) {
      const selectedDate = availableDates[selectedDateIndex]?.date;
      if (selectedDate) {
        generateTimeSlots(merchant.open_time, merchant.close_time, service.duration, selectedDate);
      }
    }
  }, [selectedDateIndex, merchant, service, availableDates]);

  // Generate available time slots based on opening hours, service duration, and existing bookings
  const generateTimeSlots = async (openTime: string, closeTime: string, duration: number, date: Date) => {
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
          available: true // Will check against existing bookings
        });
        
        // Move to next slot based on service duration (in increments of 30 mins)
        currentMinute += 30; 
      }

      // Check for existing bookings for this date
      const dateString = format(date, 'yyyy-MM-dd');
      await checkBookedSlots(slots, dateString);
      
      setSelectedTimeSlot(null); // Reset selected time slot when the date changes
    } catch (error) {
      console.error('Error generating time slots:', error);
      toast.error('Could not generate time slots');
    }
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
      
      if (!bookings || !service) {
        setTimeSlots(slots);
        return;
      }
      
      // Mark slots as unavailable if they overlap with any existing booking
      const serviceDuration = service.duration;
      
      const updatedSlots = slots.map(slot => {
        const slotStartMinutes = convertTimeToMinutes(slot.time);
        const slotEndMinutes = slotStartMinutes + serviceDuration;
        
        // Check if this slot overlaps with any existing booking
        const isOverlapping = bookings.some(booking => {
          const bookingStartMinutes = convertTimeToMinutes(booking.time_slot);
          const bookingService = booking.service_id;
          
          // Get the duration of the booked service
          let bookingDuration = serviceDuration; // Default to current service duration as fallback
          
          // For more accurate blocking, we should fetch the actual service duration
          // This would ideally be part of the booking record, but for now we assume it's the same
          
          const bookingEndMinutes = bookingStartMinutes + bookingDuration;
          
          // Check if there's any overlap between this slot and the booking
          return (
            (slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes) ||
            (bookingStartMinutes < slotEndMinutes && bookingEndMinutes > slotStartMinutes)
          );
        });
        
        return { ...slot, available: !isOverlapping };
      });
      
      setTimeSlots(updatedSlots);
    } catch (error) {
      console.error('Error checking booked slots:', error);
      setTimeSlots(slots); // Use the original slots if there's an error
    }
  };

  const convertTimeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleDateSelection = (index: number) => {
    setSelectedDateIndex(index);
  };

  const handleContinue = () => {
    if (!availableDates[selectedDateIndex]) {
      toast.error('Please select a date');
      return;
    }
    
    if (!selectedTimeSlot) {
      toast.error('Please select a time slot');
      return;
    }

    if (staff.length > 0 && !selectedStaff) {
      toast.error('Please select a stylist');
      return;
    }

    // Navigate to payment page with booking details
    navigate(`/payment/${merchantId}/${serviceId}`, {
      state: {
        bookingDate: format(availableDates[selectedDateIndex].date, 'yyyy-MM-dd'),
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
    <div className="pb-20 bg-white min-h-screen">
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
          <h1 className="text-xl font-medium">Date and time</h1>
        </div>
      </div>
      
      <div className="p-4 space-y-8">
        {/* Date Selection */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Date</h2>
          <div className="grid grid-cols-4 gap-2 overflow-x-auto">
            {availableDates.map((dateOption, index) => (
              <div key={index} className="flex-shrink-0">
                <button
                  onClick={() => handleDateSelection(index)}
                  className={cn(
                    "w-full rounded-lg p-3 border transition-all duration-200",
                    selectedDateIndex === index
                      ? "border-booqit-primary bg-booqit-primary text-white"
                      : "border-gray-200 hover:border-booqit-primary/50"
                  )}
                >
                  <div className="text-center">
                    <div className="font-medium">{dateOption.day}</div>
                    <div className={`${selectedDateIndex === index ? 'text-white' : 'text-gray-500'} text-sm`}>
                      {dateOption.label}
                    </div>
                    <div className={`${selectedDateIndex === index ? 'text-white' : 'text-gray-500'} text-xs mt-1`}>
                      {service.duration} mins
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Time Slots */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Time</h2>
          {timeSlots.length > 0 ? (
            <RadioGroup
              value={selectedTimeSlot || ''}
              onValueChange={setSelectedTimeSlot}
              className="space-y-2"
            >
              {timeSlots.map((slot) => (
                <div key={slot.time}>
                  <label
                    className={cn(
                      "flex justify-between items-center p-4 rounded-md border transition-all",
                      slot.available 
                        ? selectedTimeSlot === slot.time
                          ? "bg-booqit-primary text-white border-booqit-primary"
                          : "bg-white hover:border-booqit-primary/50 border-gray-200"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border-transparent"
                    )}
                  >
                    <div className="flex items-center">
                      <RadioGroupItem
                        value={slot.time}
                        disabled={!slot.available}
                        className={selectedTimeSlot === slot.time ? "border-white text-white" : ""}
                      />
                      <span className="ml-2">{slot.time} AM</span>
                    </div>
                    {(selectedDateIndex === 0 || selectedDateIndex === 1) && slot.available && (
                      <span className="text-sm font-medium text-green-500">20% Off</span>
                    )}
                  </label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No available time slots for the selected date</p>
            </div>
          )}
        </div>
        
        {/* Staff Selection */}
        {staff.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Choose your stylist</h2>
            <div className="space-y-3">
              <Card className={cn(
                "border transition-all overflow-hidden",
                selectedStaff === null ? "border-booqit-primary" : "border-gray-200"
              )}>
                <CardContent className="p-0">
                  <button 
                    onClick={() => setSelectedStaff(null)}
                    className="w-full p-4 flex items-center text-left"
                  >
                    <div className="bg-blue-100 rounded-full p-3 mr-4">
                      <UserIcon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-semibold">Any Stylist</div>
                      <div className="text-gray-500 text-sm">Next available stylist</div>
                    </div>
                  </button>
                </CardContent>
              </Card>
              
              {staff.map((stylist) => (
                <Card 
                  key={stylist.id}
                  className={cn(
                    "border transition-all overflow-hidden",
                    selectedStaff === stylist.id ? "border-booqit-primary" : "border-gray-200"
                  )}
                >
                  <CardContent className="p-0">
                    <button 
                      onClick={() => setSelectedStaff(stylist.id)}
                      className="w-full p-4 flex items-center text-left"
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded-full mr-4 overflow-hidden">
                        {/* Placeholder for stylist image */}
                        <UserIcon className="h-12 w-12 p-2 text-gray-400" />
                      </div>
                      <div>
                        <div className="font-semibold">{stylist.name}</div>
                        <div className="text-gray-500 text-sm">Hair Specialist</div>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom confirm button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedTimeSlot}
        >
          Confirm Appointment
        </Button>
      </div>
    </div>
  );
};

export default BookingPage;
