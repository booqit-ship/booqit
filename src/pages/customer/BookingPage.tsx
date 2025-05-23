
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, isBefore, startOfToday } from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  ChevronLeft,
  UserIcon,
  Users,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Merchant, Service, Staff } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string | null;
}

interface DateOption {
  date: Date;
  label: string;
  day: string;
}

type BookingStep = 'services' | 'stylist' | 'datetime' | 'summary';

interface SelectedService {
  service: Service;
  staffId: string | null;
}

const BookingPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-step booking state
  const [currentStep, setCurrentStep] = useState<BookingStep>('services');
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [currentServiceIndex, setCurrentServiceIndex] = useState<number>(0);
  
  // Booking state
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  
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
    const fetchMerchantDetails = async () => {
      try {
        setLoading(true);
        if (!merchantId) return;
        
        // Fetch merchant details
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', merchantId)
          .single();
          
        if (merchantError) throw merchantError;
        
        // Fetch services for this merchant
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('merchant_id', merchantId);
          
        if (servicesError) throw servicesError;
        
        // Fetch staff for this merchant
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);
          
        if (staffError) throw staffError;
        
        setMerchant(merchantData);
        setServices(servicesData || []);
        setStaff(staffData || []);

      } catch (error) {
        console.error('Error fetching details:', error);
        toast.error('Could not load booking details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMerchantDetails();
  }, [merchantId]);

  // Regenerate time slots when date or service selection changes
  useEffect(() => {
    if (merchant && selectedServices.length > 0 && availableDates.length > 0) {
      const selectedDate = availableDates[selectedDateIndex]?.date;
      if (selectedDate) {
        // Calculate total duration for all selected services
        const totalDuration = selectedServices.reduce((total, selection) => {
          return total + selection.service.duration;
        }, 0);
        
        generateTimeSlots(merchant.open_time, merchant.close_time, totalDuration, selectedDate);
      }
    }
  }, [selectedDateIndex, merchant, selectedServices, availableDates]);

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
        
        // Move to next slot based on 30-minute increments
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
      
      if (!bookings || selectedServices.length === 0) {
        setTimeSlots(slots);
        return;
      }
      
      // Get total duration for all selected services
      const totalDuration = selectedServices.reduce((total, selection) => {
        return total + selection.service.duration;
      }, 0);
      
      const updatedSlots = slots.map(slot => {
        const slotStartMinutes = convertTimeToMinutes(slot.time);
        const slotEndMinutes = slotStartMinutes + totalDuration;
        
        // Check if this slot overlaps with any existing booking
        const isOverlapping = bookings.some(booking => {
          const bookingStartMinutes = convertTimeToMinutes(booking.time_slot);
          let bookingDuration = 30; // Default fallback
          
          // Try to find the service associated with the booking to get its duration
          const bookingServiceId = booking.service_id;
          const service = services.find(s => s.id === bookingServiceId);
          if (service) {
            bookingDuration = service.duration;
          }
          
          const bookingEndMinutes = bookingStartMinutes + bookingDuration;
          
          // We need to access staff_id safely since it might not exist in the booking type
          const bookingStaffId = (booking as any).staff_id;
          
          // If we have a selected staff for the service, check if it conflicts
          const selectedServiceWithStaff = selectedServices.find(s => s.staffId === bookingStaffId);
          
          if (selectedServiceWithStaff) {
            return (
              (slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes) ||
              (bookingStartMinutes < slotEndMinutes && bookingEndMinutes > slotStartMinutes)
            );
          }
          
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

  const handleServiceToggle = (service: Service, checked: boolean) => {
    if (checked) {
      setSelectedServices([...selectedServices, { service, staffId: null }]);
    } else {
      setSelectedServices(selectedServices.filter(s => s.service.id !== service.id));
    }
  };

  const handleStaffSelection = (staffId: string | null) => {
    const updatedServices = [...selectedServices];
    updatedServices[currentServiceIndex] = {
      ...updatedServices[currentServiceIndex],
      staffId
    };
    setSelectedServices(updatedServices);
  };

  const handleContinue = () => {
    switch (currentStep) {
      case 'services':
        if (selectedServices.length === 0) {
          toast.error('Please select at least one service');
          return;
        }
        setCurrentStep('stylist');
        setCurrentServiceIndex(0);
        break;
      case 'stylist':
        if (currentServiceIndex < selectedServices.length - 1) {
          // Move to next service for stylist selection
          setCurrentServiceIndex(prevIndex => prevIndex + 1);
        } else {
          // All stylists selected, move to datetime
          setCurrentStep('datetime');
        }
        break;
      case 'datetime':
        if (!availableDates[selectedDateIndex]) {
          toast.error('Please select a date');
          return;
        }
        
        if (!selectedTimeSlot) {
          toast.error('Please select a time slot');
          return;
        }
        
        setCurrentStep('summary');
        break;
      case 'summary':
        // Navigate to payment page with booking details
        navigate(`/payment/${merchantId}`, {
          state: {
            bookingDate: format(availableDates[selectedDateIndex].date, 'yyyy-MM-dd'),
            bookingTime: selectedTimeSlot,
            selectedServices: selectedServices,
            serviceTotalPrice: calculateTotalPrice(),
            serviceTotalDuration: calculateTotalDuration(),
            merchantName: merchant?.shop_name
          }
        });
        break;
    }
  };
  
  const calculateTotalPrice = () => {
    return selectedServices.reduce((total, selection) => {
      return total + selection.service.price;
    }, 0);
  };
  
  const calculateTotalDuration = () => {
    return selectedServices.reduce((total, selection) => {
      return total + selection.service.duration;
    }, 0);
  };
  
  const isStaffAssignedToService = (staffMember: Staff, serviceId: string) => {
    return staffMember.assigned_service_ids.includes(serviceId);
  };

  const getAssignableStaffForService = (serviceId: string) => {
    return staff.filter(staffMember => isStaffAssignedToService(staffMember, serviceId));
  };
  
  const getCurrentService = () => {
    return currentServiceIndex < selectedServices.length ? selectedServices[currentServiceIndex].service : null;
  };
  
  const getStepTitle = () => {
    switch (currentStep) {
      case 'services':
        return 'Select Services';
      case 'stylist':
        return `Choose Stylist for ${getCurrentService()?.name}`;
      case 'datetime':
        return 'Select Date & Time';
      case 'summary':
        return 'Booking Summary';
      default:
        return '';
    }
  };
  
  const handleStepBack = () => {
    if (currentStep === 'stylist' && currentServiceIndex > 0) {
      // Go back to previous service in stylist selection
      setCurrentServiceIndex(prevIndex => prevIndex - 1);
      return;
    }
    
    switch (currentStep) {
      case 'stylist':
        setCurrentStep('services');
        break;
      case 'datetime':
        setCurrentStep('stylist');
        setCurrentServiceIndex(selectedServices.length - 1);
        break;
      case 'summary':
        setCurrentStep('datetime');
        break;
      default:
        navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Merchant not found</p>
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
            onClick={handleStepBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">{getStepTitle()}</h1>
        </div>
      </div>
      
      <div className="p-4 space-y-8">
        {/* Service Selection */}
        {currentStep === 'services' && (
          <div className="space-y-4">
            {services.map(service => (
              <Card key={service.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id={`service-${service.id}`}
                          checked={selectedServices.some(s => s.service.id === service.id)}
                          onCheckedChange={(checked) => handleServiceToggle(service, checked === true)}
                        />
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{service.duration} mins</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">{service.description}</p>
                    </div>
                    <span className="font-semibold">₹{service.price}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Stylist Selection */}
        {currentStep === 'stylist' && currentServiceIndex < selectedServices.length && (
          <div className="space-y-4">
            <div className="bg-gray-100 p-3 rounded-lg mb-4">
              <h3 className="font-semibold">{selectedServices[currentServiceIndex].service.name}</h3>
              <p className="text-sm text-gray-500">{selectedServices[currentServiceIndex].service.duration} mins • ₹{selectedServices[currentServiceIndex].service.price}</p>
            </div>
            
            <div className="space-y-3">
              {/* Any Stylist Option */}
              <Card className={cn(
                "border transition-all overflow-hidden",
                selectedServices[currentServiceIndex].staffId === null ? "border-booqit-primary" : "border-gray-200"
              )}>
                <CardContent className="p-0">
                  <button 
                    onClick={() => handleStaffSelection(null)}
                    className="w-full p-4 flex items-center text-left"
                  >
                    <div className="bg-booqit-primary/20 rounded-full p-3 mr-4">
                      <Users className="h-6 w-6 text-booqit-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">Any Stylist</div>
                      <div className="text-gray-500 text-sm">Next available stylist</div>
                    </div>
                  </button>
                </CardContent>
              </Card>
              
              {/* Available Stylists for the current service */}
              {getAssignableStaffForService(selectedServices[currentServiceIndex].service.id).map((stylist) => (
                <Card 
                  key={stylist.id}
                  className={cn(
                    "border transition-all overflow-hidden",
                    selectedServices[currentServiceIndex].staffId === stylist.id ? "border-booqit-primary" : "border-gray-200"
                  )}
                >
                  <CardContent className="p-0">
                    <button 
                      onClick={() => handleStaffSelection(stylist.id)}
                      className="w-full p-4 flex items-center text-left"
                    >
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarFallback className="bg-gray-200 text-gray-700">
                          {stylist.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{stylist.name}</div>
                        <div className="text-gray-500 text-sm">Hair Specialist</div>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              ))}
              
              {getAssignableStaffForService(selectedServices[currentServiceIndex].service.id).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-500">No stylists available for this service</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Date and Time Selection */}
        {currentStep === 'datetime' && (
          <>
            {/* Date Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Date</h2>
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
                          {calculateTotalDuration()} mins
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Time Slots */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Time</h2>
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
                          <span className="ml-2">{slot.time}</span>
                        </div>
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
          </>
        )}
        
        {/* Summary */}
        {currentStep === 'summary' && (
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold text-lg mb-3">Booking Summary</h2>
              <Separator className="mb-3" />
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700">Services</h3>
                  {selectedServices.map((selection, index) => (
                    <div key={index} className="flex justify-between items-center mt-2">
                      <div>
                        <p className="font-medium">{selection.service.name}</p>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{selection.service.duration} mins</span>
                          {selection.staffId ? (
                            <span className="ml-2">• {staff.find(s => s.id === selection.staffId)?.name || 'Selected stylist'}</span>
                          ) : (
                            <span className="ml-2">• Any stylist</span>
                          )}
                        </div>
                      </div>
                      <span>₹{selection.service.price}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-medium">
                      {format(availableDates[selectedDateIndex].date, 'MMMM dd, yyyy')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time</span>
                    <span className="font-medium">{selectedTimeSlot}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Salon</span>
                    <span className="font-medium">{merchant.shop_name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-medium">{calculateTotalDuration()} mins</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>₹{calculateTotalPrice()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Bottom continue button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handleContinue}
          disabled={
            (currentStep === 'services' && selectedServices.length === 0) ||
            (currentStep === 'datetime' && !selectedTimeSlot)
          }
        >
          {currentStep === 'summary' ? 'Proceed to Payment' : 'Continue'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default BookingPage;
