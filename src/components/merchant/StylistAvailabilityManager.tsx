
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Staff } from '@/types';
import { format } from 'date-fns';
import { formatTimeToAmPm, formatTimeFrom12To24 } from '@/utils/timeUtils';
import { 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  X,
  UserX
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
  selectedDate,
  onAvailabilityChange
}) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [stylistHolidays, setStylistHolidays] = useState<StylistHoliday[]>([]);
  const [stylistBlockedSlots, setStylistBlockedSlots] = useState<StylistBlockedSlot[]>([]);
  const [isFullDayHoliday, setIsFullDayHoliday] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

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
  }, [selectedStaff]);

  const isDateHoliday = stylistHolidays.some(
    holiday => holiday.holiday_date === selectedDateStr
  );

  const blockedSlotsForDate = stylistBlockedSlots.filter(
    slot => slot.blocked_date === selectedDateStr
  );

  const handleFullDayHoliday = async () => {
    if (!selectedStaff) return;
    
    setIsLoading(true);
    try {
      if (isDateHoliday) {
        const holiday = stylistHolidays.find(h => h.holiday_date === selectedDateStr);
        if (holiday) {
          const { error } = await supabase
            .from('stylist_holidays')
            .delete()
            .eq('id', holiday.id);
            
          if (error) throw error;
          
          setStylistHolidays(prev => prev.filter(h => h.id !== holiday.id));
          toast({
            title: "Success",
            description: "Holiday removed successfully.",
          });
        }
      } else {
        const { error } = await supabase
          .from('stylist_holidays')
          .insert({
            staff_id: selectedStaff,
            merchant_id: merchantId,
            holiday_date: selectedDateStr,
            description: description || null
          });
          
        if (error) throw error;
        
        const { data: holidays } = await supabase
          .from('stylist_holidays')
          .select('*')
          .eq('staff_id', selectedStaff);
          
        setStylistHolidays(holidays || []);
        
        toast({
          title: "Success",
          description: "Full day holiday added successfully.",
        });
      }
      
      setDescription('');
      setDialogOpen(false);
      onAvailabilityChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update holiday. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSlotToggle = async (timeSlot: string) => {
    if (!selectedStaff) return;
    
    const existingSlot = blockedSlotsForDate.find(slot => slot.time_slot === timeSlot);
    
    try {
      if (existingSlot) {
        const { error } = await supabase
          .from('stylist_blocked_slots')
          .delete()
          .eq('id', existingSlot.id);
          
        if (error) throw error;
        
        setStylistBlockedSlots(prev => prev.filter(slot => slot.id !== existingSlot.id));
      } else {
        const { error } = await supabase
          .from('stylist_blocked_slots')
          .insert({
            staff_id: selectedStaff,
            merchant_id: merchantId,
            blocked_date: selectedDateStr,
            time_slot: timeSlot,
            description: description || null
          });
          
        if (error) throw error;
        
        const { data: blockedSlots } = await supabase
          .from('stylist_blocked_slots')
          .select('*')
          .eq('staff_id', selectedStaff);
          
        setStylistBlockedSlots(blockedSlots || []);
      }
      
      onAvailabilityChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update time slot. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedStaffMember = staff.find(s => s.id === selectedStaff);

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

        {selectedStaff && (
          <>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </span>
              </div>
              {isDateHoliday && (
                <Badge variant="destructive" className="text-xs">
                  Holiday
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Full Day Holiday</span>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant={isDateHoliday ? "destructive" : "default"}
                      size="sm"
                    >
                      {isDateHoliday ? 'Remove Holiday' : 'Mark Holiday'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {isDateHoliday ? 'Remove Holiday' : 'Mark Full Day Holiday'}
                      </DialogTitle>
                      <DialogDescription>
                        {isDateHoliday 
                          ? `Remove holiday for ${selectedStaffMember?.name} on ${format(selectedDate, 'MMMM d, yyyy')}`
                          : `Mark ${selectedStaffMember?.name} as unavailable for the entire day on ${format(selectedDate, 'MMMM d, yyyy')}`
                        }
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!isDateHoliday && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description (Optional)</label>
                        <Textarea 
                          placeholder="Add a reason for the holiday"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="resize-none"
                        />
                      </div>
                    )}
                    
                    <DialogFooter>
                      <Button
                        onClick={handleFullDayHoliday}
                        disabled={isLoading}
                        variant={isDateHoliday ? "destructive" : "default"}
                      >
                        {isLoading ? 'Processing...' : (isDateHoliday ? 'Remove Holiday' : 'Mark Holiday')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {!isDateHoliday && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Block Specific Time Slots</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((slot) => {
                      const isBlocked = blockedSlotsForDate.some(blockedSlot => blockedSlot.time_slot === slot);
                      
                      return (
                        <Button
                          key={slot}
                          variant={isBlocked ? "destructive" : "outline"}
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleTimeSlotToggle(slot)}
                        >
                          {formatTimeToAmPm(slot)}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {blockedSlotsForDate.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {blockedSlotsForDate.length} slot(s) blocked
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StylistAvailabilityManager;
