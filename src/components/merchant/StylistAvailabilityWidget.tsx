
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Staff } from '@/types';
import { format, isBefore, startOfDay } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { Settings, Calendar as CalendarIcon, User } from 'lucide-react';
import StylistAvailabilityManager from './StylistAvailabilityManager';

interface StylistHoliday {
  id: string;
  staff_id: string;
  holiday_date: string;
  description: string | null;
  staff?: { name: string };
}

interface StylistBlockedSlot {
  id: string;
  staff_id: string;
  blocked_date: string;
  time_slot: string;
  description: string | null;
  staff?: { name: string };
}

interface StylistAvailabilityWidgetProps {
  merchantId: string;
  selectedDate: Date;
  onAvailabilityChange: () => void;
}

const StylistAvailabilityWidget: React.FC<StylistAvailabilityWidgetProps> = ({
  merchantId,
  selectedDate,
  onAvailabilityChange
}) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [stylistHolidays, setStylistHolidays] = useState<StylistHoliday[]>([]);
  const [stylistBlockedSlots, setStylistBlockedSlots] = useState<StylistBlockedSlot[]>([]);
  const [showManager, setShowManager] = useState(false);
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
    
    fetchStaff();
  }, [merchantId]);

  const fetchAllAvailabilityData = async () => {
    try {
      const { data: holidays, error: holidaysError } = await supabase
        .from('stylist_holidays')
        .select(`
          *,
          staff:staff_id(name)
        `)
        .eq('merchant_id', merchantId);
        
      if (holidaysError) throw holidaysError;
      setStylistHolidays(holidays || []);

      const { data: blockedSlots, error: blockedError } = await supabase
        .from('stylist_blocked_slots')
        .select(`
          *,
          staff:staff_id(name)
        `)
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

  const handleAvailabilityChangeAndRefresh = () => {
    fetchAllAvailabilityData();
    onAvailabilityChange();
  };

  if (showManager) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setShowManager(false)}
          className="w-full"
        >
          ← Back to Overview
        </Button>
        <StylistAvailabilityManager
          merchantId={merchantId}
          selectedDate={selectedDate}
          onAvailabilityChange={handleAvailabilityChangeAndRefresh}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Stylist Availability
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowManager(true)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Manage
          </Button>
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
                  <div className="font-medium text-sm flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {group.staffName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(group.date), 'MMM dd, yyyy')} • 
                    {group.type === 'holiday' ? ' Full Day Holiday' : ` ${group.items.length} slots blocked`}
                  </div>
                  {group.type === 'slots' && group.items.length <= 3 && (
                    <div className="text-xs text-gray-400 mt-1">
                      {group.items.map((item: any) => formatTimeToAmPm(item.time_slot)).join(', ')}
                    </div>
                  )}
                </div>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StylistAvailabilityWidget;
