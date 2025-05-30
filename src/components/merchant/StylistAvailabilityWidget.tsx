
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, isBefore, startOfDay } from 'date-fns';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { Settings, Calendar as CalendarIcon, User, Plus } from 'lucide-react';
import StylistAvailabilityPopup from './StylistAvailabilityPopup';

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
  start_time: string;
  end_time: string;
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
  const [stylistHolidays, setStylistHolidays] = useState<StylistHoliday[]>([]);
  const [stylistBlockedSlots, setStylistBlockedSlots] = useState<StylistBlockedSlot[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const { toast } = useToast();

  const fetchAllAvailabilityData = async () => {
    try {
      console.log('Fetching availability data for merchant:', merchantId);
      
      const { data: holidays, error: holidaysError } = await supabase
        .from('stylist_holidays')
        .select(`
          *,
          staff:staff_id(name)
        `)
        .eq('merchant_id', merchantId);
        
      if (holidaysError) {
        console.error('Error fetching holidays:', holidaysError);
        throw holidaysError;
      }
      
      console.log('Fetched holidays:', holidays);
      setStylistHolidays(holidays || []);

      // Updated query to fetch blocked slots with time ranges
      const { data: blockedSlots, error: blockedError } = await supabase
        .from('stylist_blocked_slots')
        .select(`
          *,
          staff:staff_id(name)
        `)
        .eq('merchant_id', merchantId)
        .not('start_time', 'is', null)
        .not('end_time', 'is', null);
        
      if (blockedError) {
        console.error('Error fetching blocked slots:', blockedError);
        throw blockedError;
      }
      
      console.log('Fetched blocked slots:', blockedSlots);
      setStylistBlockedSlots(blockedSlots || []);
    } catch (error) {
      console.error('Error fetching availability data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch availability data.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (merchantId) {
      fetchAllAvailabilityData();
    }
  }, [merchantId]);

  // Auto-delete past entries
  useEffect(() => {
    const deletePastEntries = async () => {
      if (!merchantId) return;

      const today = startOfDay(new Date());
      
      const pastHolidays = stylistHolidays.filter(holiday => 
        isBefore(new Date(holiday.holiday_date), today)
      );

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
          await fetchAllAvailabilityData();
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

  // Group data by staff and date
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

  const formatTimeRange = (slot: StylistBlockedSlot) => {
    if (slot.start_time && slot.end_time) {
      return `${formatTimeToAmPm(slot.start_time)} - ${formatTimeToAmPm(slot.end_time)}`;
    }
    return 'Time range';
  };

  return (
    <>
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
              onClick={() => setShowPopup(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
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
                      {group.type === 'holiday' ? ' Full Day Holiday' : ` ${group.items.length} time range(s) blocked`}
                    </div>
                    {group.type === 'slots' && group.items.length <= 3 && (
                      <div className="text-xs text-gray-400 mt-1">
                        {group.items.map((item: StylistBlockedSlot, index: number) => (
                          <div key={index}>{formatTimeRange(item)}</div>
                        ))}
                      </div>
                    )}
                    {group.items[0]?.description && (
                      <div className="text-xs text-gray-400 mt-1 italic">
                        "{group.items[0].description}"
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

      <StylistAvailabilityPopup
        open={showPopup}
        onOpenChange={setShowPopup}
        merchantId={merchantId}
        onAvailabilityChange={handleAvailabilityChangeAndRefresh}
      />
    </>
  );
};

export default StylistAvailabilityWidget;
