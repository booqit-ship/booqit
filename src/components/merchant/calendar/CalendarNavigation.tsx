
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

interface CalendarNavigationProps {
  date: Date;
  onDateChange: (date: Date) => void;
  isMobile: boolean;
  isHoliday: (date: Date) => boolean;
  holidayDialogOpen: boolean;
  setHolidayDialogOpen: (open: boolean) => void;
  holidayDescription: string;
  setHolidayDescription: (description: string) => void;
  onAddHoliday: () => void;
  onRemoveHoliday: () => void;
}

const CalendarNavigation: React.FC<CalendarNavigationProps> = ({
  date,
  onDateChange,
  isMobile,
  isHoliday,
  holidayDialogOpen,
  setHolidayDialogOpen,
  holidayDescription,
  setHolidayDescription,
  onAddHoliday,
  onRemoveHoliday,
}) => {
  const handlePrevDay = () => {
    onDateChange(subDays(date, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(date, 1));
  };

  const handleAddHoliday = () => {
    onAddHoliday();
  };

  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-2">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevDay}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-sm sm:text-base font-semibold text-booqit-dark min-w-[120px] sm:min-w-[140px] text-center">
          {format(date, isMobile ? 'MMM d' : 'MMMM d, yyyy')}
        </h2>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextDay}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        {isHoliday(date) ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={onRemoveHoliday}
            className="h-8"
          >
            <X className="h-3 w-3 mr-1" />
            Remove Holiday
          </Button>
        ) : (
          <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-1" />
                Mark Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Mark Shop Holiday</DialogTitle>
                <DialogDescription>
                  Mark {format(date, 'MMMM d, yyyy')} as a shop holiday.
                </DialogDescription>
              </DialogHeader>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Holiday Date</label>
                <Input
                  type="date"
                  value={format(date, 'yyyy-MM-dd')}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                <Textarea 
                  placeholder="e.g., Festival holiday, Personal leave, etc."
                  value={holidayDescription}
                  onChange={(e) => setHolidayDescription(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>
              
              <DialogFooter>
                <Button onClick={handleAddHoliday} className="w-full">
                  Mark as Holiday
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default CalendarNavigation;
