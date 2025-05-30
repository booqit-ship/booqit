
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { format, isBefore, startOfDay } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { User, Calendar as CalendarIcon, Settings } from 'lucide-react';

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

interface StylistAvailabilityWidgetProps {
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

const StylistAvailabilityWidget: React.FC<StylistAvailabilityWidgetProps> = ({
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

  const fetchAllAvailabilityData = async () => {
    try {
      const { data: holidays, error: holidaysError } = await supabase
        .from('stylist_holidays')
        .select('*, staff:staff_id(name)')
        .eq('merchant_id', merchantId);
        
      if (holidaysError) throw holidaysError;
      setStylistHolidays(holidays || []);

      const { data: blockedSlots, error: blockedError } = await supabase
        .from('stylist_blocked_slots')
        .select('*, staff:staff_id(name)')
        .eq('merchant_id', merchantId);
        
      if (blockedError) throw blockedError;
      setStylistBlockedSlots(blockedSlots || []);
    } catch (error) {
      console.error('Error fetching availability data:', error);
    }
  };

  useEffect(() => {
    fetchAllAvailabilityData();
  }, [merchantId]);

  // Auto-delete past entries
  useEffect(() => {
    const deletePastEntries = async () => {
      if (!merchantId) return;

      const today = startOfDay(new Date());
      
      // Delete past holidays
      const pastHolidays = stylistHolidays.filter(holiday => 
        isBefore(new Date(holiday.holiday_date), today)
      );

      // Delete past blocked slots
      const pastBlockedSlots = stylistBlockedSlots.filter(slot => 
        isBefore(new Date(slot.blocked_date), today)
      );

      try {
        if (pastHolidays.length > 0) {
          const pastHolidayIds = pastHolidays.map(h => h.id);
          await supabase
            .from('stylist_holidays')
            .delete()
            .in('id', pastHolidayIds);
          console.log(`Deleted ${pastHolidays.length} past stylist holidays`);
        }

        if (pastBlockedSlots.length > 0) {
          const pastSlotIds = pastBlockedSlots.map(s => s.id);
          await supabase
            .from('stylist_blocked_slots')
            .delete()
            .in('id', pastSlotIds);
          console.log(`Deleted ${pastBlockedSlots.length} past stylist blocked slots`);
        }

        if (pastHolidays.length > 0 || pastBlockedSlots.length > 0) {
          await fetchAllAvailabilityData(); // Refresh data after deletion
          onAvailabilityChange();
        }
      } catch (error) {
        console.error('Error deleting past entries:', error);
      }
    };

    if (stylistHolidays.length > 0 || stylistBlockedSlots.length > 0) {
      deletePastEntries();
    }
  }, [stylistHolidays.length, stylistBlockedSlots.length, merchantId, onAvailabilityChange]);

  useEffect(() => {
    if (selectedStaff) {
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
        setDescription('');
      }
    }
  }, [selectedStaff, selectedDateStr, stylistHolidays, stylistBlockedSlots]);

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

      await fetchAllAvailabilityData();
      
      toast({
        title: "Success",
        description: "Stylist availability updated successfully.",
      });
      
      setDialogOpen(false);
      setSelectedStaff('');
      setIsFullDayHoliday(false);
      setSelectedTimeSlots([]);
      setDescription('');
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

  const handleEdit = (staffId: string, date: string) => {
    setSelectedStaff(staffId);
    setDialogOpen(true);
  };

  const handleDelete = async (type: 'holiday' | 'slot', id: string) => {
    try {
      const table = type === 'holiday' ? 'stylist_holidays' : 'stylist_blocked_slots';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      await fetchAllAvailabilityData();
      onAvailabilityChange();
      
      toast({
        title: "Success",
        description: "Entry deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isHoliday = (item: StylistHoliday | StylistBlockedSlot): item is StylistHoliday => {
    return 'holiday_date' in item;
  };

  const getItemDate = (item: StylistHoliday | StylistBlockedSlot): string => {
    return isHoliday(item) ? item.holiday_date : item.blocked_date;
  };

  // Filter out past entries for display (only show today and future)
  const today = startOfDay(new Date());
  const futureHolidays = stylistHolidays.filter(holiday => 
    !isBefore(new Date(holiday.holiday_date), today)
  );
  const futureBlockedSlots = stylistBlockedSlots.filter(slot => 
    !isBefore(new Date(slot.blocked_date), today)
  );

  const groupedData = [...futureHolidays, ...futureBlockedSlots].reduce((acc: any, item) => {
    const itemDate = getItemDate(item);
    const key = `${item.staff_id}_${itemDate}`;
    if (!acc[key]) {
      acc[key] = {
        staffId: item.staff_id,
        staffName: (item as any).staff?.name || 'Unknown',
        date: itemDate,
        type: isHoliday(item) ? 'holiday' : 'slots',
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Stylist Availability
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-1" />
                Manage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Stylist Availability</DialogTitle>
                <DialogDescription>
                  Set holiday or block specific time slots for {format(selectedDate, 'MMMM d, yyyy')}
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

                {selectedStaff && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="fullDay"
                          checked={isFullDayHoliday}
                          onChange={(e) => {
                            setIsFullDayHoliday(e.target.checked);
                            if (e.target.checked) {
                              setSelectedTimeSlots([]);
                            }
                          }}
                          className="rounded"
                        />
                        <label htmlFor="fullDay" className="text-sm font-medium">
                          Full Day Holiday
                        </label>
                      </div>
                    </div>

                    {!isFullDayHoliday && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Block Specific Time Slots</label>
                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
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
                        placeholder="Add a reason or note"
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
                <Button
                  onClick={handleSave}
                  disabled={isLoading || !selectedStaff}
                  className="w-full"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {Object.keys(groupedData).length === 0 ? (
          <div className="text-center py-4 border rounded-md bg-gray-50">
            <CalendarIcon className="h-6 w-6 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm">No upcoming availability restrictions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.values(groupedData).map((group: any) => (
              <div key={`${group.staffId}_${group.date}`} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                <div className="flex-1">
                  <div className="font-medium text-sm">{group.staffName}</div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(group.date), 'MMM dd, yyyy')} • 
                    {group.type === 'holiday' ? ' Full Day Holiday' : ` ${group.items.length} slots blocked`}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(group.staffId, group.date)}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      group.items.forEach((item: any) => {
                        handleDelete(group.type === 'holiday' ? 'holiday' : 'slot', item.id);
                      });
                    }}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StylistAvailabilityWidget;
