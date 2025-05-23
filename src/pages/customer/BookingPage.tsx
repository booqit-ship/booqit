
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  Clock, 
  ChevronLeft, 
  User as UserIcon,
  CheckCircle2
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface SelectedService {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface SelectedStaff {
  serviceId: string;
  staffId: string | 'random';
  staffName: string;
}

const BookingPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-service booking state
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedStaffMembers, setSelectedStaffMembers] = useState<SelectedStaff[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  
  // Booking flow steps
  const [currentStep, setCurrentStep] = useState(1);
  
  // Time slots generation
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  
  // Fetch merchant, services and staff
  useEffect(() => {
    const fetchMerchantData = async () => {
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
        setMerchant(merchantData);
        
        // Fetch services for this merchant
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('merchant_id', merchantId);
          
        if (servicesError) throw servicesError;
        setServices(servicesData || []);
        
        // Fetch staff for this merchant
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);
          
        if (staffError) throw staffError;
        setStaffList(staffData || []);
      } catch (error) {
        console.error('Error fetching details:', error);
        toast.error('Could not load booking details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMerchantData();
  }, [merchantId]);

  // Calculate total price and duration when selected services change
  useEffect(() => {
    const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
    const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
    
    setTotalPrice(totalPrice);
    setTotalDuration(totalDuration);
  }, [selectedServices]);

  // Generate time slots when date changes or services are selected
  useEffect(() => {
    if (merchant && selectedDate && selectedServices.length > 0) {
      generateTimeSlots(merchant.open_time, merchant.close_time, totalDuration);
    }
  }, [selectedDate, merchant, selectedServices, totalDuration]);

  const handleServiceToggle = (service: Service, isChecked: boolean) => {
    if (isChecked) {
      setSelectedServices(prev => [...prev, {
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.duration
      }]);
    } else {
      setSelectedServices(prev => prev.filter(s => s.id !== service.id));
      // Also remove staff selection for this service
      setSelectedStaffMembers(prev => prev.filter(staff => staff.serviceId !== service.id));
    }
  };

  const handleStaffSelection = (serviceId: string, staffId: string, staffName: string) => {
    // Check if this service already has a selected staff
    const exists = selectedStaffMembers.some(s => s.serviceId === serviceId);
    
    if (exists) {
      // Update existing selection
      setSelectedStaffMembers(prev => 
        prev.map(s => s.serviceId === serviceId 
          ? { serviceId, staffId, staffName } 
          : s
        )
      );
    } else {
      // Add new selection
      setSelectedStaffMembers(prev => [...prev, { 
        serviceId, 
        staffId, 
        staffName 
      }]);
    }
  };

  // Generate available time slots based on opening hours and service duration
  const generateTimeSlots = (openTime: string, closeTime: string, duration: number) => {
    const slots: TimeSlot[] = [];
    
    try {
      // Convert opening and closing times to minutes since midnight
      const openMinutes = convertTimeToMinutes(openTime);
      const closeMinutes = convertTimeToMinutes(closeTime);
      
      // Create slots in 30-minute intervals
      let currentMinute = openMinutes;
      const interval = 30; // 30 minute intervals
      
      while (currentMinute + duration <= closeMinutes) {
        const hour = Math.floor(currentMinute / 60);
        const minute = currentMinute % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        slots.push({ 
          time: timeString, 
          available: true // Will check against bookings later
        });
        
        currentMinute += interval; // Move to next slot
      }

      // Check for existing bookings
      if (selectedDate) {
        checkBookedSlots(slots, selectedDate.toISOString().split('T')[0], duration);
      }
    } catch (error) {
      console.error('Error generating time slots:', error);
      toast.error('Could not generate time slots');
    }
    
    setTimeSlots(slots);
  };

  const checkBookedSlots = async (slots: TimeSlot[], dateString: string, duration: number) => {
    try {
      // Fetch existing bookings for this date and merchant
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('date', dateString);
      
      if (error) throw error;
      
      // Mark slots as unavailable if they overlap with existing bookings
      const updatedSlots = slots.map(slot => {
        const slotStartMinutes = convertTimeToMinutes(slot.time);
        const slotEndMinutes = slotStartMinutes + duration;
        
        // Check if this slot overlaps with any booking
        const isOverlapping = bookings?.some(booking => {
          const bookingStartMinutes = convertTimeToMinutes(booking.time_slot);
          const bookingServiceDuration = 60; // Assume 1 hour if we don't know the actual duration
          const bookingEndMinutes = bookingStartMinutes + bookingServiceDuration;
          
          // Check for overlap
          return (
            (slotStartMinutes >= bookingStartMinutes && slotStartMinutes < bookingEndMinutes) ||
            (slotEndMinutes > bookingStartMinutes && slotEndMinutes <= bookingEndMinutes) ||
            (slotStartMinutes <= bookingStartMinutes && slotEndMinutes >= bookingEndMinutes)
          );
        });
        
        return { ...slot, available: !isOverlapping };
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (selectedServices.length === 0) {
        toast.error('Please select at least one service');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Check if all services have staff assigned
      const allServicesHaveStaff = selectedServices.every(service => 
        selectedStaffMembers.some(staff => staff.serviceId === service.id)
      );
      
      if (!allServicesHaveStaff) {
        toast.error('Please select a stylist for each service');
        return;
      }
      
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!selectedDate || !selectedTimeSlot) {
        toast.error('Please select a date and time slot');
        return;
      }
      
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Navigate to payment with booking details
      navigate(`/payment/${merchantId}`, {
        state: {
          services: selectedServices,
          staffMembers: selectedStaffMembers,
          bookingDate: selectedDate?.toISOString().split('T')[0],
          bookingTime: selectedTimeSlot,
          totalPrice: totalPrice,
          totalDuration: totalDuration,
          merchantName: merchant?.shop_name
        }
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
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
    <div className="pb-20">
      <div className="relative bg-booqit-primary text-white p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 left-4 text-white hover:bg-white/20"
          onClick={handleBack}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-center text-xl font-medium">Book Appointment</h1>
        
        {/* Step indicators */}
        <div className="flex justify-center mt-2 gap-1">
          {[1, 2, 3, 4].map((step) => (
            <div 
              key={step}
              className={`h-2 w-2 rounded-full ${
                currentStep >= step ? 'bg-white' : 'bg-white/40'
              }`}
            ></div>
          ))}
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Step 1: Select Services */}
        {currentStep === 1 && (
          <>
            <h2 className="text-lg font-medium">Select Services</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <Card key={service.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={selectedServices.some(s => s.id === service.id)}
                        onCheckedChange={(checked) => 
                          handleServiceToggle(service, checked === true)
                        }
                      />
                      <div className="flex-grow">
                        <Label 
                          htmlFor={`service-${service.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {service.name}
                        </Label>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-500">{formatDuration(service.duration)}</span>
                          <span className="font-medium">₹{service.price}</span>
                        </div>
                        {service.description && (
                          <p className="text-gray-500 text-sm mt-1">{service.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {selectedServices.length > 0 && (
                <div className="pt-4">
                  <Separator className="mb-4" />
                  <div className="flex justify-between text-lg font-medium">
                    <span>Total</span>
                    <span>₹{totalPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Duration</span>
                    <span>{formatDuration(totalDuration)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Step 2: Select Stylists */}
        {currentStep === 2 && (
          <>
            <h2 className="text-lg font-medium mb-3">Select Stylists</h2>
            <div className="space-y-4">
              {selectedServices.map((service) => (
                <Card key={service.id}>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2">{service.name}</h3>
                    <Separator className="my-2" />
                    
                    <RadioGroup
                      value={selectedStaffMembers.find(s => s.serviceId === service.id)?.staffId || ''}
                      onValueChange={(value) => {
                        if (value === 'random') {
                          handleStaffSelection(service.id, 'random', 'Random Stylist');
                        } else {
                          const staff = staffList.find(s => s.id === value);
                          if (staff) {
                            handleStaffSelection(service.id, staff.id, staff.name);
                          }
                        }
                      }}
                    >
                      <div className="space-y-2">
                        {/* Random option always available */}
                        <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50">
                          <RadioGroupItem value="random" id={`random-${service.id}`} />
                          <Label htmlFor={`random-${service.id}`} className="cursor-pointer">
                            Random Stylist
                          </Label>
                        </div>
                        
                        {/* Filter staff who can provide this service */}
                        {staffList
                          .filter(staff => staff.assigned_service_ids.includes(service.id))
                          .map((staff) => (
                            <div 
                              key={staff.id} 
                              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50"
                            >
                              <RadioGroupItem value={staff.id} id={`staff-${service.id}-${staff.id}`} />
                              <Label 
                                htmlFor={`staff-${service.id}-${staff.id}`}
                                className="cursor-pointer"
                              >
                                {staff.name}
                              </Label>
                            </div>
                          ))}
                          
                        {staffList.filter(staff => staff.assigned_service_ids.includes(service.id)).length === 0 && (
                          <p className="text-gray-500 text-sm italic">No specific stylists available for this service</p>
                        )}
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
        
        {/* Step 3: Select Date & Time */}
        {currentStep === 3 && (
          <>
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
            
            {/* Service Duration Notice */}
            {selectedServices.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-md text-sm">
                <p className="flex items-center text-blue-700">
                  <Clock className="h-4 w-4 mr-2" />
                  Total duration: {formatDuration(totalDuration)}
                </p>
              </div>
            )}
          </>
        )}
        
        {/* Step 4: Review & Confirm */}
        {currentStep === 4 && (
          <>
            <h2 className="text-lg font-medium mb-3">Booking Summary</h2>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium">Services</h3>
                <Separator className="my-2" />
                
                <div className="space-y-3">
                  {selectedServices.map((service) => {
                    const staffMember = selectedStaffMembers.find(s => s.serviceId === service.id);
                    
                    return (
                      <div key={service.id} className="flex justify-between">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {staffMember && (
                            <p className="text-sm text-gray-500">
                              Stylist: {staffMember.staffName}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">
                            {formatDuration(service.duration)}
                          </p>
                        </div>
                        <p className="font-medium">₹{service.price}</p>
                      </div>
                    );
                  })}
                </div>
                
                <Separator className="my-3" />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="font-medium">
                      {selectedDate ? format(selectedDate, 'PP') : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time</span>
                    <span className="font-medium">
                      {selectedTimeSlot}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-medium">
                      {formatDuration(totalDuration)}
                    </span>
                  </div>
                </div>
                
                <Separator className="my-3" />
                
                <div className="flex justify-between text-lg font-medium">
                  <span>Total</span>
                  <span>₹{totalPrice}</span>
                </div>
              </CardContent>
            </Card>
            
            <div className="mt-6 flex items-center justify-center">
              <p className="text-gray-500 text-sm flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                You'll pay at the shop after service
              </p>
            </div>
          </>
        )}
        
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
          size="lg"
          onClick={handleContinue}
        >
          {currentStep === 4 ? 'Continue to Payment' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};

export default BookingPage;
