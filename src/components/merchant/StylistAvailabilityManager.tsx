import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Staff } from '@/types';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, X, Trash2 } from 'lucide-react';
import StylistAvailabilityPopup from './StylistAvailabilityPopup';
import AvailabilityDeletionDialog from './AvailabilityDeletionDialog';

interface StylistAvailabilityManagerProps {
  merchantId: string;
}

interface AvailabilityData {
  date: string;
  staff_name: string;
  staff_id: string;
  is_holiday: boolean;
  blocked_ranges: Array<{
    start_time: string;
    end_time: string;
    description?: string;
  }>;
  description?: string;
}

const StylistAvailabilityManager: React.FC<StylistAvailabilityManagerProps> = ({ merchantId }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingAvailability, setDeletingAvailability] = useState<AvailabilityData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Fetch staff members
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId)
          .order('name');

        if (error) throw error;
        setStaff(data || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: "Error",
          description: "Failed to fetch staff data",
          variant: "destructive"
        });
      }
    };

    fetchStaff();
  }, [merchantId, toast]);

  // Fetch availability data for selected date
  useEffect(() => {
    const fetchAvailabilityData = async () => {
      if (!selectedDate) return;

      setIsLoading(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        // Fetch holidays
        const { data: holidays, error: holidaysError } = await supabase
          .from('stylist_holidays')
          .select(`
            staff_id,
            description,
            staff!inner(name)
          `)
          .eq('holiday_date', dateStr)
          .eq('merchant_id', merchantId);

        if (holidaysError) throw holidaysError;

        // Fetch blocked slots
        const { data: blockedSlots, error: blockedSlotsError } = await supabase
          .from('stylist_blocked_slots')
          .select(`
            staff_id,
            start_time,
            end_time,
            description,
            staff!inner(name)
          `)
          .eq('blocked_date', dateStr)
          .eq('merchant_id', merchantId);

        if (blockedSlotsError) throw blockedSlotsError;

        // Combine data
        const availabilityMap = new Map<string, AvailabilityData>();

        // Add holidays
        holidays?.forEach((holiday: any) => {
          availabilityMap.set(holiday.staff_id, {
            date: dateStr,
            staff_name: holiday.staff.name,
            staff_id: holiday.staff_id,
            is_holiday: true,
            blocked_ranges: [],
            description: holiday.description
          });
        });

        // Add blocked slots
        blockedSlots?.forEach((slot: any) => {
          const existing = availabilityMap.get(slot.staff_id);
          if (existing && !existing.is_holiday) {
            existing.blocked_ranges.push({
              start_time: slot.start_time,
              end_time: slot.end_time,
              description: slot.description
            });
          } else if (!existing) {
            availabilityMap.set(slot.staff_id, {
              date: dateStr,
              staff_name: slot.staff.name,
              staff_id: slot.staff_id,
              is_holiday: false,
              blocked_ranges: [{
                start_time: slot.start_time,
                end_time: slot.end_time,
                description: slot.description
              }],
              description: slot.description
            });
          }
        });

        setAvailabilityData(Array.from(availabilityMap.values()));
      } catch (error) {
        console.error('Error fetching availability data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch availability data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailabilityData();
  }, [selectedDate, merchantId, toast]);

  const handleManageAvailability = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setShowPopup(true);
  };

  const handleDeleteAvailability = (availability: AvailabilityData) => {
    setDeletingAvailability(availability);
    setShowDeleteDialog(true);
  };

  const confirmDeleteAvailability = async () => {
    if (!deletingAvailability || !selectedDate) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('clear_stylist_availability', {
        p_staff_id: deletingAvailability.staff_id,
        p_date: format(selectedDate, 'yyyy-MM-dd')
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Availability settings deleted successfully"
      });

      // Refresh data
      setAvailabilityData(prev => 
        prev.filter(item => item.staff_id !== deletingAvailability.staff_id)
      );
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast({
        title: "Error",
        description: "Failed to delete availability settings",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeletingAvailability(null);
    }
  };

  const refreshData = () => {
    // Trigger a re-fetch of availability data
    if (selectedDate) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');

          const { data: holidays, error: holidaysError } = await supabase
            .from('stylist_holidays')
            .select(`
              staff_id,
              description,
              staff!inner(name)
            `)
            .eq('holiday_date', dateStr)
            .eq('merchant_id', merchantId);

          if (holidaysError) throw holidaysError;

          const { data: blockedSlots, error: blockedSlotsError } = await supabase
            .from('stylist_blocked_slots')
            .select(`
              staff_id,
              start_time,
              end_time,
              description,
              staff!inner(name)
            `)
            .eq('blocked_date', dateStr)
            .eq('merchant_id', merchantId);

          if (blockedSlotsError) throw blockedSlotsError;

          const availabilityMap = new Map<string, AvailabilityData>();

          holidays?.forEach((holiday: any) => {
            availabilityMap.set(holiday.staff_id, {
              date: dateStr,
              staff_name: holiday.staff.name,
              staff_id: holiday.staff_id,
              is_holiday: true,
              blocked_ranges: [],
              description: holiday.description
            });
          });

          blockedSlots?.forEach((slot: any) => {
            const existing = availabilityMap.get(slot.staff_id);
            if (existing && !existing.is_holiday) {
              existing.blocked_ranges.push({
                start_time: slot.start_time,
                end_time: slot.end_time,
                description: slot.description
              });
            } else if (!existing) {
              availabilityMap.set(slot.staff_id, {
                date: dateStr,
                staff_name: slot.staff.name,
                staff_id: slot.staff_id,
                is_holiday: false,
                blocked_ranges: [{
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  description: slot.description
                }],
                description: slot.description
              });
            }
          });

          setAvailabilityData(Array.from(availabilityMap.values()));
        } catch (error) {
          console.error('Error refreshing data:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-righteous font-medium">Stylist Availability</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-righteous font-medium">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Staff List and Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous font-medium">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {staff.map((staffMember) => {
              const availability = availabilityData.find(a => a.staff_id === staffMember.id);
              
              return (
                <div key={staffMember.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium font-poppins">{staffMember.name}</h4>
                    
                    {availability ? (
                      <div className="mt-2 space-y-1">
                        {availability.is_holiday ? (
                          <Badge variant="destructive" className="font-poppins">
                            Holiday
                            {availability.description && ` - ${availability.description}`}
                          </Badge>
                        ) : availability.blocked_ranges.length > 0 ? (
                          <div className="space-y-1">
                            {availability.blocked_ranges.map((range, index) => (
                              <Badge key={index} variant="secondary" className="flex items-center gap-1 font-poppins">
                                <Clock className="h-3 w-3" />
                                {range.start_time} - {range.end_time}
                                {range.description && ` (${range.description})`}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-green-600 font-poppins">Available</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageAvailability(staffMember)}
                      className="font-poppins"
                    >
                      Manage
                    </Button>
                    
                    {availability && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAvailability(availability)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {staff.length === 0 && (
              <p className="text-center text-muted-foreground py-8 font-poppins">
                No staff members found. Add some staff first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Availability Management Popup */}
      {showPopup && selectedStaff && selectedDate && (
        <StylistAvailabilityPopup
          open={showPopup}
          onOpenChange={setShowPopup}
          merchantId={merchantId}
          onAvailabilityChange={refreshData}
        />
      )}

      {/* Deletion Confirmation Dialog */}
      <AvailabilityDeletionDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteAvailability}
        isDeleting={isDeleting}
        staffName={deletingAvailability?.staff_name || ''}
        date={selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
      />
    </div>
  );
};

export default StylistAvailabilityManager;
