import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from 'date-fns';
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { List, ListItem } from "@/components/ui/list"
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Staff } from '@/types';
import { toast } from 'sonner';
import { formatTimeToAmPm } from '@/utils/timeUtils';

const DateTimeSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration } = location.state;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { userId } = useAuth();

  useEffect(() => {
    fetchStaffList();
  }, [merchantId]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [selectedDate, selectedStaff, merchantId, totalDuration]);

  const fetchStaffList = async () => {
    if (!merchantId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('merchant_id', merchantId);

      if (error) throw error;
      setStaffList(data || []);
    } catch (error) {
      console.error('Error fetching staff list:', error);
      toast.error('Could not load staff list');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!merchantId || !selectedDate || !selectedStaff) return;

    try {
      setIsLoading(true);
      console.log('Fetching slots with total duration:', totalDuration);
      
      const { data, error } = await supabase.rpc('get_available_slots_with_ist_buffer', {
        p_merchant_id: merchantId,
        p_date: format(selectedDate, 'yyyy-MM-dd'),
        p_staff_id: selectedStaff.id,
        p_service_duration: totalDuration || 30 // Use total duration
      });

      if (error) {
        console.error('Error fetching available slots:', error);
        toast.error('Failed to load available time slots');
        return;
      }

      console.log('Available slots:', data);
      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedTime) {
      toast.error('Please select a time slot');
      return;
    }

    navigate(`/booking/${merchantId}/payment`, {
      state: {
        merchant,
        selectedServices,
        selectedStaff,
        selectedDate: format(selectedDate, 'yyyy-MM-dd'),
        selectedTime,
        totalPrice,
        totalDuration
      }
    });
  };

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
          <h2 className="text-lg font-semibold mb-2">Choose Date & Time</h2>
          <p className="text-gray-500 text-sm">Select the date and time for your appointment</p>
        </div>

        {/* Calendar and Date Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center" side="bottom">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Staff Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Staff</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading staff...</div>
            ) : staffList.length > 0 ? (
              <List className="divide-y divide-gray-200">
                {staffList.map(staff => (
                  <ListItem
                    key={staff.id}
                    className={`cursor-pointer hover:bg-gray-50 p-3 ${selectedStaff?.id === staff.id ? 'bg-gray-100' : ''}`}
                    onClick={() => setSelectedStaff(staff)}
                  >
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{staff.name}</span>
                    </div>
                  </ListItem>
                ))}
              </List>
            ) : (
              <div className="text-center py-4">No staff available</div>
            )}
          </CardContent>
        </Card>

        {/* Time Slot Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading available times...</div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {availableSlots.map(slot => (
                  <Button
                    key={slot}
                    variant={selectedTime === slot ? 'default' : 'outline'}
                    onClick={() => setSelectedTime(slot)}
                  >
                    {formatTimeToAmPm(slot)}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">No time slots available for the selected date and staff.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedDate || !selectedStaff || !selectedTime}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default DateTimeSelectionPage;
