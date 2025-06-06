
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Clock, CalendarOff, CalendarX, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Staff } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface TimeRange {
  startTime: string;
  endTime: string;
}

interface StylistAvailabilityPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  onAvailabilityChange: () => void;
}

const StylistAvailabilityPopup: React.FC<StylistAvailabilityPopupProps> = ({
  open,
  onOpenChange,
  merchantId,
  onAvailabilityChange
}) => {
  const [step, setStep] = useState(1);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [modalTab, setModalTab] = useState<string>('full-day');
  const [description, setDescription] = useState<string>('');
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([{ startTime: '10:00', endTime: '11:00' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [autoCancel, setAutoCancel] = useState(true);
  const { toast } = useToast();

  // Fetch staff members when modal opens
  useEffect(() => {
    const fetchStaff = async () => {
      if (!open || !merchantId) return;
      
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId)
          .order('name');

        if (error) throw error;
        setStaff(data || []);
        if (data && data.length > 0) {
          setSelectedStaff(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: "Error",
          description: "Failed to load staff members",
          variant: "destructive"
        });
      }
    };

    fetchStaff();
  }, [open, merchantId, toast]);

  const resetForm = () => {
    setStep(1);
    setSelectedStaff('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setModalTab('full-day');
    setDescription('');
    setTimeRanges([{ startTime: '10:00', endTime: '11:00' }]);
    setAutoCancel(true);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleNextStep = () => {
    if (step === 1 && !selectedStaff) {
      toast({
        title: "Error",
        description: "Please select a stylist",
        variant: "destructive"
      });
      return;
    }
    
    setStep(step + 1);
  };

  const handleBackStep = () => {
    setStep(step - 1);
  };

  const handleAddTimeRange = () => {
    setTimeRanges([...timeRanges, { startTime: '10:00', endTime: '11:00' }]);
  };

  const handleRemoveTimeRange = (index: number) => {
    const newTimeRanges = [...timeRanges];
    newTimeRanges.splice(index, 1);
    setTimeRanges(newTimeRanges);
  };

  const handleTimeRangeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newTimeRanges = [...timeRanges];
    newTimeRanges[index] = { ...newTimeRanges[index], [field]: value };
    setTimeRanges(newTimeRanges);
  };

  const validateTimeRanges = () => {
    for (const range of timeRanges) {
      if (!range.startTime || !range.endTime) {
        toast({
          title: "Error",
          description: "Please enter both start and end times",
          variant: "destructive"
        });
        return false;
      }

      if (range.startTime >= range.endTime) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (step === 2 && modalTab === 'time-range' && !validateTimeRanges()) {
      return;
    }

    setIsSaving(true);
    
    try {
      if (modalTab === 'full-day') {
        // Use the enhanced function with auto-cancellation
        const { data, error } = await supabase.rpc('manage_stylist_availability', {
          p_staff_id: selectedStaff,
          p_merchant_id: merchantId,
          p_date: selectedDate,
          p_is_full_day: true,
          p_description: description || null,
          p_auto_cancel: autoCancel
        });

        if (error) throw error;
        
        const result = data as { success: boolean; message?: string; error?: string; cancellations?: any };
        
        if (result && result.success) {
          // Show success message with cancellation info if available
          if (result.cancellations && result.cancellations.cancelled_count > 0) {
            toast({
              title: "Success",
              description: `Holiday saved successfully. ${result.cancellations.cancelled_count} affected bookings were automatically cancelled.`
            });
          } else {
            toast({
              title: "Success",
              description: "Holiday saved successfully"
            });
          }
        } else {
          throw new Error(result?.error || 'Failed to save availability');
        }
      } else {
        // Convert time ranges to jsonb array for the new function
        const rangesArray = timeRanges.map(range => ({
          start_time: range.startTime,
          end_time: range.endTime
        }));
        
        // Use the enhanced function with auto-cancellation
        const { data, error } = await supabase.rpc('manage_stylist_availability_ranges', {
          p_staff_id: selectedStaff,
          p_merchant_id: merchantId,
          p_date: selectedDate,
          p_is_full_day: false,
          p_blocked_ranges: rangesArray,
          p_description: description || null,
          p_auto_cancel: autoCancel
        });

        if (error) throw error;
        
        const result = data as { success: boolean; message?: string; error?: string; cancellations?: any };
        
        if (result && result.success) {
          // Show success message with cancellation info if available
          if (result.cancellations && result.cancellations.cancelled_count > 0) {
            toast({
              title: "Success",
              description: `Time ranges saved successfully. ${result.cancellations.cancelled_count} affected bookings were automatically cancelled.`
            });
          } else {
            toast({
              title: "Success",
              description: "Time ranges saved successfully"
            });
          }
        } else {
          throw new Error(result?.error || 'Failed to save time ranges');
        }
      }

      // Update parent component and close modal
      onAvailabilityChange();
      handleClose();
    } catch (error: any) {
      console.error('Error saving availability:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save availability settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">Select Stylist</label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger>
                <SelectValue placeholder="Select stylist" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Select Date</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <Tabs value={modalTab} onValueChange={setModalTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="full-day">Full Day Off</TabsTrigger>
              <TabsTrigger value="time-range">Specific Times</TabsTrigger>
            </TabsList>
            <TabsContent value="full-day" className="py-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-center p-4 rounded-md bg-red-50 mb-3">
                    <CalendarOff className="h-12 w-12 text-red-500 mr-4" />
                    <div>
                      <h3 className="font-semibold text-red-800 mb-1">Full Day Holiday</h3>
                      <p className="text-xs text-red-600">Stylist will not be available for the entire day</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Reason (Optional)</label>
                    <Textarea
                      placeholder="e.g., Personal leave, Training day, etc."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="time-range" className="py-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-center p-4 rounded-md bg-amber-50 mb-3">
                    <Clock className="h-12 w-12 text-amber-500 mr-4" />
                    <div>
                      <h3 className="font-semibold text-amber-800 mb-1">Time Range Block</h3>
                      <p className="text-xs text-amber-600">Block specific time ranges when stylist is not available</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Reason (Optional)</label>
                    <Textarea
                      placeholder="e.g., Lunch break, Meeting, etc."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                  </div>
                  
                  {timeRanges.map((range, index) => (
                    <div key={index} className="flex flex-wrap items-end gap-2 py-2">
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-xs font-medium block mb-1">Start Time</label>
                        <Input
                          type="time"
                          value={range.startTime}
                          onChange={(e) => handleTimeRangeChange(index, 'startTime', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-xs font-medium block mb-1">End Time</label>
                        <Input
                          type="time"
                          value={range.endTime}
                          onChange={(e) => handleTimeRangeChange(index, 'endTime', e.target.value)}
                        />
                      </div>
                      {timeRanges.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTimeRange(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10"
                        >
                          <CalendarX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTimeRange}
                    className="w-full mt-2"
                  >
                    Add Another Time Range
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="pt-2 space-y-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="auto-cancel" 
                checked={autoCancel} 
                onCheckedChange={setAutoCancel} 
              />
              <Label htmlFor="auto-cancel">
                Auto-cancel affected bookings
              </Label>
            </div>
            
            {autoCancel && (
              <div className="flex items-start space-x-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Bookings that conflict with this {modalTab === 'full-day' ? 'holiday' : 'time block'} will be 
                  automatically cancelled. Customers will be notified.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 
              ? "Manage Stylist Availability"
              : modalTab === 'full-day'
                ? "Add Holiday for Stylist"
                : "Block Time Ranges"
            }
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Select the stylist and date to manage availability"
              : "Set up availability restrictions for the selected stylist"
            }
          </DialogDescription>
        </DialogHeader>
        
        {renderStepContent()}
        
        <DialogFooter>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBackStep}
              className="mr-auto"
              disabled={isSaving}
            >
              Back
            </Button>
          )}
          
          {step < 2 ? (
            <Button onClick={handleNextStep} disabled={!selectedStaff}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Availability"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StylistAvailabilityPopup;
