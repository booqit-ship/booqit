
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { format, isBefore, startOfDay } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronDown,
  Edit
} from 'lucide-react';

interface StylistAvailabilityPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  onAvailabilityChange: () => void;
}

interface SqlResponse {
  success: boolean;
  message?: string;
  error?: string;
}

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

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

const StylistAvailabilityPopup: React.FC<StylistAvailabilityPopupProps> = ({
  open,
  onOpenChange,
  merchantId,
  onAvailabilityChange
}) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isFullDayHoliday, setIsFullDayHoliday] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingHoliday, setExistingHoliday] = useState<StylistHoliday | null>(null);
  const [existingBlockedSlots, setExistingBlockedSlots] = useState<StylistBlockedSlot[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

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
    
    if (open) {
      fetchStaff();
    }
  }, [merchantId, open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStaff('');
      setSelectedDate(new Date());
      setIsFullDayHoliday(false);
      setSelectedTimeSlots([]);
      setDescription('');
      setExistingHoliday(null);
      setExistingBlockedSlots([]);
      setIsEditMode(false);
    }
  }, [open]);

  // Load existing availability data when staff and date change
  useEffect(() => {
    const loadExistingData = async () => {
      if (!selectedStaff || !selectedDate) return;

      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      
      try {
        // Check for existing holiday
        const { data: holidayData, error: holidayError } = await supabase
          .from('stylist_holidays')
          .select('*')
          .eq('staff_id', selectedStaff)
          .eq('holiday_date', selectedDateStr)
          .single();

        if (holidayError && holidayError.code !== 'PGRST116') {
          console.error('Error fetching holiday:', holidayError);
        } else if (holidayData) {
          setExistingHoliday(holidayData);
          setIsFullDayHoliday(true);
          setDescription(holidayData.description || '');
          setSelectedTimeSlots([]);
          setIsEditMode(true);
          return;
        }

        // Check for existing blocked slots
        const { data: slotsData, error: slotsError } = await supabase
          .from('stylist_blocked_slots')
          .select('*')
          .eq('staff_id', selectedStaff)
          .eq('blocked_date', selectedDateStr);

        if (slotsError) {
          console.error('Error fetching blocked slots:', slotsError);
        } else if (slotsData && slotsData.length > 0) {
          setExistingBlockedSlots(slotsData);
          setSelectedTimeSlots(slotsData.map(slot => slot.time_slot));
          setDescription(slotsData[0]?.description || '');
          setIsFullDayHoliday(false);
          setIsEditMode(true);
        } else {
          // No existing data
          setExistingHoliday(null);
          setExistingBlockedSlots([]);
          setIsFullDayHoliday(false);
          setSelectedTimeSlots([]);
          setDescription('');
          setIsEditMode(false);
        }
      } catch (error) {
        console.error('Error loading existing data:', error);
      }
    };

    loadExistingData();
  }, [selectedStaff, selectedDate]);

  const handleTimeSlotToggle = (timeSlot: string) => {
    setSelectedTimeSlots(prev => 
      prev.includes(timeSlot) 
        ? prev.filter(slot => slot !== timeSlot)
        : [...prev, timeSlot]
    );
  };

  const regenerateSlots = async () => {
    try {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Call the generate_stylist_slots function to regenerate slots
      const { error } = await supabase.rpc('generate_stylist_slots', {
        p_merchant_id: merchantId,
        p_date: selectedDateStr
      });
      
      if (error) {
        console.error('Error regenerating slots:', error);
      } else {
        console.log('Successfully regenerated slots for', selectedDateStr);
      }
    } catch (error) {
      console.error('Error in slot regeneration:', error);
    }
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

    if (!isFullDayHoliday && selectedTimeSlots.length === 0) {
      toast({
        title: "Error",
        description: "Please select time slots to block or mark as full day holiday.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('manage_stylist_availability', {
        p_staff_id: selectedStaff,
        p_merchant_id: merchantId,
        p_date: selectedDateStr,
        p_is_full_day: isFullDayHoliday,
        p_blocked_slots: isFullDayHoliday ? null : selectedTimeSlots,
        p_description: description || null
      });

      if (error) throw error;

      const response = data as unknown as SqlResponse;
      if (!response.success) {
        throw new Error(response.message || 'Failed to update availability');
      }
      
      // Regenerate slots to ensure consistency
      await regenerateSlots();
      
      toast({
        title: "Success",
        description: isEditMode ? "Stylist availability updated successfully." : "Stylist availability saved successfully.",
      });
      
      onOpenChange(false);
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

  const handleClear = async () => {
    if (!selectedStaff || !selectedDate) return;

    setIsLoading(true);
    try {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase.rpc('clear_stylist_availability', {
        p_staff_id: selectedStaff,
        p_date: selectedDateStr
      });

      if (error) throw error;

      const response = data as unknown as SqlResponse;
      if (!response.success) {
        throw new Error(response.message || 'Failed to clear availability');
      }
      
      // Regenerate slots to ensure consistency
      await regenerateSlots();
      
      // Reset form
      setIsFullDayHoliday(false);
      setSelectedTimeSlots([]);
      setDescription('');
      setExistingHoliday(null);
      setExistingBlockedSlots([]);
      setIsEditMode(false);
      
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? <Edit className="h-4 w-4" /> : null}
            {isEditMode ? 'Edit' : 'Manage'} Stylist Availability
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Edit existing availability restrictions.' : 'Block time slots or mark full day holidays for stylists.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
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
              {isEditMode && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800">
                      Editing existing restrictions for {selectedStaffMember?.name}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClear}
                      disabled={isLoading}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              )}

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
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
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
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !selectedStaff || (!isFullDayHoliday && selectedTimeSlots.length === 0)}
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StylistAvailabilityPopup;
