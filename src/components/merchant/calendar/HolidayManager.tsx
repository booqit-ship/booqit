
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Flag, CalendarX, X, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HolidayDate {
  id: string;
  holiday_date: string;
  description: string | null;
}

interface HolidayManagerProps {
  holidays: HolidayDate[];
  isLoading: boolean;
  onDeleteHoliday: (holidayId: string) => void;
  onHolidayAdded: () => void;
  merchantId: string;
}

const HolidayManager: React.FC<HolidayManagerProps> = ({
  holidays,
  isLoading,
  onDeleteHoliday,
  onHolidayAdded,
  merchantId,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayDescription, setNewHolidayDescription] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  const handleAddHoliday = async () => {
    if (!newHolidayDate) {
      toast.error('Please select a date for the holiday');
      return;
    }

    setAddingHoliday(true);
    try {
      const { error } = await supabase
        .from('shop_holidays')
        .insert({
          merchant_id: merchantId,
          holiday_date: newHolidayDate,
          description: newHolidayDescription || null
        });

      if (error) throw error;

      toast.success('Holiday added successfully');
      setDialogOpen(false);
      setNewHolidayDate('');
      setNewHolidayDescription('');
      onHolidayAdded();
    } catch (error: any) {
      console.error('Error adding holiday:', error);
      toast.error(error.message || 'Failed to add holiday');
    } finally {
      setAddingHoliday(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center">
            <Flag className="mr-2 h-4 w-4 text-red-500" />
            Shop Holidays
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Shop Holiday</DialogTitle>
                <DialogDescription>
                  Mark a date when your shop will be closed for business.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Holiday Date</label>
                  <Input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                  <Textarea 
                    placeholder="e.g., Festival holiday, Personal leave, etc."
                    value={newHolidayDescription}
                    onChange={(e) => setNewHolidayDescription(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  onClick={handleAddHoliday}
                  disabled={addingHoliday || !newHolidayDate}
                  className="w-full"
                >
                  {addingHoliday ? 'Adding...' : 'Add Holiday'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-booqit-primary"></div>
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-6 border rounded-md">
            <CalendarX className="h-8 w-8 mx-auto text-booqit-dark/30 mb-2" />
            <p className="text-booqit-dark/60 text-sm">No holidays marked</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1">Date</TableHead>
                  <TableHead className="w-[40px] text-right py-1">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays
                  .sort((a, b) => new Date(a.holiday_date).getTime() - new Date(b.holiday_date).getTime())
                  .map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="py-1 text-xs">
                        <div>
                          <div className="font-medium">
                            {format(parseISO(holiday.holiday_date), 'MMM dd, yyyy')}
                          </div>
                          {holiday.description && (
                            <div className="text-gray-500 text-xs">
                              {holiday.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteHoliday(holiday.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HolidayManager;
