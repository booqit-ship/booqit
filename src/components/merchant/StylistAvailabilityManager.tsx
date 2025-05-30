
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Staff } from '@/types';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  X,
  UserX,
  ChevronDown
} from 'lucide-react';

interface StylistHoliday {
  id: string;
  staff_id: string;
  holiday_date: string;
  description: string | null;
}

interface StylistBlockedSlot {
  id: string;
  staff_id: string;
  blocked_date: string;
  time_slot: string;
  description: string | null;
}

interface StylistAvailabilityManagerProps {
  merchantId: string;
  selectedDate: Date;
  onAvailabilityChange: () => void;
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

const StylistAvailabilityManager: React.FC<StylistAvailabilityManagerProps> = ({
  merchantId,
  selectedDate: initialSelectedDate,
  onAvailabilityChange
}) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(initialSelectedDate);
  const [stylistHolidays, setStylistHolidays] = useState<StylistHoliday[]>([]);
  const [stylistBlockedSlots, setStylistBlockedSlots] = useState<StylistBlockedSlot[]>([]);
  const [isFullDayHoliday, setIsFullDayHoliday] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // Update selectedDate when initialSelectedDate changes
  useEffect(() => {
    setSelectedDate(initialSelectedDate);
  }, [initialSelectedDate]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);
          
        if (error) throw error;
        setStaff(data || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };
    
    fetchStaff();
  }, [merchantId]);

  useEffect(() => {
    const fetchAvailabilityData = async () => {
      if (!selectedStaff) return;
      
      try {
        const { data: holidays, error: holidaysError } = await supabase
          .from('stylist_holidays')
          .select('*')
          .eq('staff_id', selectedStaff);
          
        if (holidaysError) throw holidaysError;
        setStylistHolidays(holidays || []);

        const { data: blockedSlots, error: blockedError } = await supabase
          .from('stylist_blocked_slots')
          .select('*')
          .eq('staff_id', selectedStaff);
          
        if (blockedError) throw blockedError;
        setStylistBlockedSlots(blockedSlots || []);
      } catch (error) {
        console.error('Error fetching availability data:', error);
      }
    };
    
    fetchAvailabilityData();
  }, [selectedStaff, selectedDate]);

  // Check current status for selected date and staff
  useEffect(() => {
    if (selectedStaff && selectedDateStr) {
      const existingHoliday = stylistHolidays.find(
        h => h.staff_id === selectedStaff && h.holiday_date === selectedDateStr
      );
      
      if (existingHoliday) {
        setIsFullDayHoliday(true);
        setDescription(existingHoliday.description || '');
        setSelectedTimeSlots([]);
      } else {
        setIsFullDayHoliday(false);
        const existingSlots = stylistBlockedSlots
          .filter(s => s.staff_id === selectedStaff && s.blocked_date === selectedDateStr)
          .map(s => s.time_slot);
        setSelectedTimeSlots(existingSlots);
        
        // Get description from first blocked slot if any
        const firstBlockedSlot = stylistBlockedSlots.find(
          s => s.staff_id === selectedStaff && s.blocked_date === selectedDateStr
        );
        setDescription(firstBlockedSlot?.description || '');
      }
    } else {
      setIsFullDayHoliday(false);
      setSelectedTimeSlots([]);
      setDescription('');
    }
  }, [selectedStaff, selectedDateStr, stylistHolidays, stylistBlockedSlots]);

  const isDateHoliday = stylistHolidays.some(
    holiday => holiday.staff_id === selectedStaff && holiday.holiday_date === selectedDateStr
  );

  const blockedSlotsForDate = stylistBlockedSlots.filter(
    slot => slot.staff_id === selectedStaff && slot.blocked_date === selectedDateStr
  );

  const handleTimeSlotToggle = (timeSlot: string) => {
    setSelectedTimeSlots(prev => 
      prev.includes(timeSlot) 
        ? prev.filter(slot => slot !== timeSlot)
        : [...prev, timeSlot]
    );
  };

  const handleSave = async () => {
    if (!selectedStaff) {
      toast({
        title: "Error",
        description: "Please select a stylist first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, remove any existing entries for this staff member and date
      await supabase
        .from('stylist_holidays')
        .delete()
        .eq('staff_id', selectedStaff)
        .eq('holiday_date', selectedDateStr);

      await supabase
        .from('stylist_blocked_slots')
        .delete()
        .eq('staff_id', selectedStaff)
        .eq('blocked_date', selectedDateStr);

      if (isFullDayHoliday) {
        // Add full day holiday
        const { error } = await supabase
          .from('stylist_holidays')
          .insert({
            staff_id: selectedStaff,
            merchant_id: merchantId,
            holiday_date: selectedDateStr,
            description: description || null
          });
          
        if (error) throw error;
      } else if (selectedTimeSlots.length > 0) {
        // Add blocked time slots
        const blockedSlots = selectedTimeSlots.map(slot => ({
          staff_id: selectedStaff,
          merchant_id: merchantId,
          blocked_date: selectedDateStr,
          time_slot: slot,
          description: description || null
        }));

        const { error } = await supabase
          .from('stylist_blocked_slots')
          .insert(blockedSlots);
          
        if (error) throw error;
      }

      // Refresh data
      const { data: holidays } = await supabase
        .from('stylist_holidays')
        .select('*')
        .eq('staff_id', selectedStaff);
        
      setStylistHolidays(holidays || []);

      const { data: blockedSlots } = await supabase
        .from('stylist_blocked_slots')
        .select('*')
        .eq('staff_id', selectedStaff);
        
      setStylistBlockedSlots(blockedSlots || []);
      
      toast({
        title: "Success",
        description: "Stylist availability updated successfully.",
      });
      
      setDialogOpen(false);
      onAvailabilityChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAvailability = async () => {
    if (!selectedStaff) return;

    setIsLoading(true);
    try {
      // Remove all entries for this staff member and date
      await supabase
        .from('stylist_holidays')
        .delete()
        .eq('staff_id', selectedStaff)
        .eq('holiday_date', selectedDateStr);

      await supabase
        .from('stylist_blocked_slots')
        .delete()
        .eq('staff_id', selectedStaff)
        .eq('blocked_date', selectedDateStr);

      // Refresh data
      const { data: holidays } = await supabase
        .from('stylist_holidays')
        .select('*')
        .eq('staff_id', selectedStaff);
        
      setStylistHolidays(holidays || []);

      const { data: blockedSlots } = await supabase
        .from('stylist_blocked_slots')
        .select('*')
        .eq('staff_id', selectedStaff);
        
      setStylistBlockedSlots(blockedSlots || []);

      // Reset form
      setIsFullDayHoliday(false);
      setSelectedTimeSlots([]);
      setDescription('');
      
      toast({
        title: "Success",
        description: "Availability restrictions cleared successfully.",
      });
      
      onAvailabilityChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStaffMember = staff.find(s => s.id === selectedStaff);
  const hasExistingRestrictions = isDateHoliday || blockedSlotsForDate.length > 0;

  // Get available dates (next 30 days)
  const getAvailableDates = () => {
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    
    for (let i = 0; i < 30; i++) {
      dates.push(addDays(today, i));
    }
    
    return dates;
  };

  const availableDates = getAvailableDates();

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center">
          <UserX className="mr-2 h-4 w-4" />
          Stylist Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Stylist</label>
          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a stylist" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    {member.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Select Date</label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
                <ChevronDown className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {selectedStaff && (
          <>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <span className="text-sm font-medium">
                  {selectedStaffMember?.name} - {format(selectedDate, 'MMM dd, yyyy')}
                </span>
              </div>
              {hasExistingRestrictions && (
                <Badge variant={isDateHoliday ? "destructive" : "secondary"} className="text-xs">
                  {isDateHoliday ? 'Holiday' : `${blockedSlotsForDate.length} slots blocked`}
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fullDayHoliday"
                  checked={isFullDayHoliday}
                  onCheckedChange={(checked) => {
                    setIsFullDayHoliday(checked as boolean);
                    if (checked) {
                      setSelectedTimeSlots([]);
                    }
                  }}
                />
                <label htmlFor="fullDayHoliday" className="text-sm font-medium">
                  Full Day Holiday
                </label>
              </div>

              {!isFullDayHoliday && (
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Block Specific Time Slots
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedTimeSlots.includes(slot);
                      
                      return (
                        <Button
                          key={slot}
                          variant={isSelected ? "destructive" : "outline"}
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleTimeSlotToggle(slot)}
                        >
                          {formatTimeToAmPm(slot)}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {selectedTimeSlots.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {selectedTimeSlots.length} slot(s) selected
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                <Textarea 
                  placeholder="Add a reason for the restriction"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleSave}
                  disabled={isLoading || (!isFullDayHoliday && selectedTimeSlots.length === 0)}
                  className="flex-1"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                
                {hasExistingRestrictions && (
                  <Button
                    onClick={handleClearAvailability}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    {isLoading ? 'Clearing...' : 'Clear All'}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StylistAvailabilityManager;
