
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
  Edit,
  Trash2
} from 'lucide-react';

interface StylistAvailabilityPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  onAvailabilityChange: () => void;
}

interface TimeRange {
  start_time: string;
  end_time: string;
}

interface ExistingBlockedRange {
  id: string;
  start_time: string;
  end_time: string;
  description: string | null;
}

interface StylistHoliday {
  id: string;
  staff_id: string;
  holiday_date: string;
  description: string | null;
}

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
  const [selectedTimeRanges, setSelectedTimeRanges] = useState<TimeRange[]>([]);
  const [description, setDescription] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingHoliday, setExistingHoliday] = useState<StylistHoliday | null>(null);
  const [existingBlockedRanges, setExistingBlockedRanges] = useState<ExistingBlockedRange[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [availableTimeRanges, setAvailableTimeRanges] = useState<TimeRange[]>([]);
  const [merchantHours, setMerchantHours] = useState<{ open_time: string; close_time: string } | null>(null);
  const { toast } = useToast();

  // Generate time ranges based on merchant hours (30-minute intervals)
  const generateTimeRanges = (openTime: string, closeTime: string): TimeRange[] => {
    const ranges: TimeRange[] = [];
    const start = new Date(`2000-01-01T${openTime}`);
    const end = new Date(`2000-01-01T${closeTime}`);
    
    let current = new Date(start);
    
    while (current < end) {
      const next = new Date(current.getTime() + 30 * 60000); // Add 30 minutes
      if (next <= end) {
        ranges.push({
          start_time: current.toTimeString().substring(0, 5),
          end_time: next.toTimeString().substring(0, 5)
        });
      }
      current = next;
    }
    
    return ranges;
  };

  useEffect(() => {
    const fetchMerchantAndStaff = async () => {
      try {
        console.log('Fetching merchant and staff data for:', merchantId);
        
        // Fetch merchant hours
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('open_time, close_time')
          .eq('id', merchantId)
          .single();
          
        if (merchantError) {
          console.error('Error fetching merchant:', merchantError);
          throw merchantError;
        }
        
        console.log('Loaded merchant hours:', merchantData);
        setMerchantHours(merchantData);
        
        if (merchantData) {
          const ranges = generateTimeRanges(merchantData.open_time, merchantData.close_time);
          console.log('Generated time ranges:', ranges);
          setAvailableTimeRanges(ranges);
        }

        // Fetch staff
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);
          
        if (staffError) {
          console.error('Error fetching staff:', staffError);
          throw staffError;
        }
        
        console.log('Loaded staff:', staffData);
        setStaff(staffData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load merchant and staff data.",
          variant: "destructive",
        });
      }
    };
    
    if (open && merchantId) {
      fetchMerchantAndStaff();
    }
  }, [merchantId, open, toast]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStaff('');
      setSelectedDate(new Date());
      setIsFullDayHoliday(false);
      setSelectedTimeRanges([]);
      setDescription('');
      setExistingHoliday(null);
      setExistingBlockedRanges([]);
      setIsEditMode(false);
    }
  }, [open]);

  // Load existing availability data when staff and date change
  useEffect(() => {
    const loadExistingData = async () => {
      if (!selectedStaff || !selectedDate) return;

      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log('Loading existing data for staff:', selectedStaff, 'date:', selectedDateStr);
      
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
          console.log('Found existing holiday:', holidayData);
          setExistingHoliday(holidayData);
          setIsFullDayHoliday(true);
          setDescription(holidayData.description || '');
          setSelectedTimeRanges([]);
          setIsEditMode(true);
          return;
        }

        // Check for existing blocked ranges using direct query
        const { data: rangesData, error: rangesError } = await supabase
          .from('stylist_blocked_slots')
          .select('id, start_time, end_time, description')
          .eq('staff_id', selectedStaff)
          .eq('blocked_date', selectedDateStr)
          .not('start_time', 'is', null)
          .not('end_time', 'is', null);

        if (rangesError) {
          console.error('Error fetching blocked ranges:', rangesError);
        } else if (rangesData && rangesData.length > 0) {
          console.log('Found existing blocked ranges:', rangesData);
          setExistingBlockedRanges(rangesData);
          setSelectedTimeRanges(rangesData.map(range => ({
            start_time: range.start_time,
            end_time: range.end_time
          })));
          setDescription(rangesData[0]?.description || '');
          setIsFullDayHoliday(false);
          setIsEditMode(true);
        } else {
          // No existing data
          console.log('No existing availability restrictions found');
          setExistingHoliday(null);
          setExistingBlockedRanges([]);
          setIsFullDayHoliday(false);
          setSelectedTimeRanges([]);
          setDescription('');
          setIsEditMode(false);
        }
      } catch (error) {
        console.error('Error loading existing data:', error);
      }
    };

    loadExistingData();
  }, [selectedStaff, selectedDate]);

  const handleTimeRangeToggle = (range: TimeRange) => {
    setSelectedTimeRanges(prev => {
      const isSelected = prev.some(r => r.start_time === range.start_time && r.end_time === range.end_time);
      if (isSelected) {
        return prev.filter(r => !(r.start_time === range.start_time && r.end_time === range.end_time));
      } else {
        return [...prev, range];
      }
    });
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

    if (!isFullDayHoliday && selectedTimeRanges.length === 0) {
      toast({
        title: "Error",
        description: "Please select time ranges to block or mark as full day holiday.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log('Saving availability data:', {
        staff_id: selectedStaff,
        merchant_id: merchantId,
        date: selectedDateStr,
        is_full_day: isFullDayHoliday,
        blocked_ranges: selectedTimeRanges,
        description: description
      });
      
      // Prepare blocked ranges for the function call
      const blockedRangesJson = isFullDayHoliday ? null : selectedTimeRanges;
      
      const { data, error } = await supabase.rpc('manage_stylist_availability_ranges', {
        p_staff_id: selectedStaff,
        p_merchant_id: merchantId,
        p_date: selectedDateStr,
        p_is_full_day: isFullDayHoliday,
        p_blocked_ranges: blockedRangesJson,
        p_description: description || null
      });

      if (error) {
        console.error('Error saving availability:', error);
        throw error;
      }

      console.log('Save response:', data);
      const response = data as { success: boolean; message?: string };
      if (!response.success) {
        throw new Error(response.message || 'Failed to update availability');
      }
      
      toast({
        title: "Success",
        description: response.message || (isEditMode ? "Stylist availability updated successfully." : "Stylist availability saved successfully."),
      });
      
      onOpenChange(false);
      onAvailabilityChange();
    } catch (error: any) {
      console.error('Save error:', error);
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
      console.log('Clearing availability for staff:', selectedStaff, 'date:', selectedDateStr);
      
      const { data, error } = await supabase.rpc('clear_stylist_availability', {
        p_staff_id: selectedStaff,
        p_date: selectedDateStr
      });

      if (error) {
        console.error('Error clearing availability:', error);
        throw error;
      }

      console.log('Clear response:', data);
      const response = data as { success: boolean; message?: string };
      if (!response.success) {
        throw new Error(response.message || 'Failed to clear availability');
      }
      
      // Reset form
      setIsFullDayHoliday(false);
      setSelectedTimeRanges([]);
      setDescription('');
      setExistingHoliday(null);
      setExistingBlockedRanges([]);
      setIsEditMode(false);
      
      toast({
        title: "Success",
        description: "Availability restrictions cleared successfully.",
      });
      
      onAvailabilityChange();
    } catch (error: any) {
      console.error('Clear error:', error);
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
            {isEditMode ? 'Edit existing availability restrictions.' : 'Block time ranges or mark full day holidays for stylists.'}
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
                      <Trash2 className="h-3 w-3 mr-1" />
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
                      setSelectedTimeRanges([]);
                    }
                  }}
                />
                <label htmlFor="fullDayHoliday" className="text-sm font-medium">
                  Full Day Holiday
                </label>
              </div>

              {!isFullDayHoliday && availableTimeRanges.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Block Time Ranges (30-minute slots)
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {availableTimeRanges.map((range, index) => {
                      const isSelected = selectedTimeRanges.some(r => 
                        r.start_time === range.start_time && r.end_time === range.end_time
                      );
                      
                      return (
                        <Button
                          key={index}
                          variant={isSelected ? "destructive" : "outline"}
                          size="sm"
                          className="text-xs h-8 justify-start"
                          onClick={() => handleTimeRangeToggle(range)}
                        >
                          {formatTimeToAmPm(range.start_time)} - {formatTimeToAmPm(range.end_time)}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {selectedTimeRanges.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {selectedTimeRanges.length} range(s) selected
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
            disabled={isLoading || !selectedStaff || (!isFullDayHoliday && selectedTimeRanges.length === 0)}
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StylistAvailabilityPopup;
