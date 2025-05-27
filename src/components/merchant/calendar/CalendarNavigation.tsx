
import React from 'react';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';

interface CalendarNavigationProps {
  date: Date;
  onDateChange: (newDate: Date) => void;
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
  const goToPrevious = () => onDateChange(subDays(date, isMobile ? 3 : 5));
  const goToNext = () => onDateChange(addDays(date, isMobile ? 3 : 5));
  const goToToday = () => onDateChange(new Date());

  return (
    <div className="flex justify-between items-center">
      <CardTitle className="text-booqit-dark text-base sm:text-lg">Appointments</CardTitle>
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous</span>
        </Button>
        
        <Button 
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium px-2"
          onClick={goToToday}
        >
          Today
        </Button>
        
        <Button 
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={goToNext}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next</span>
        </Button>
        
        <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              size="sm"
              className="h-8 px-2 ml-1"
              onClick={() => setHolidayDialogOpen(true)}
            >
              <Flag className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs hidden xs:inline">Holiday</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[350px] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Shop Holiday</DialogTitle>
              <DialogDescription>
                {isHoliday(date) 
                  ? "This date is already marked as a holiday."
                  : "Mark this date as a shop holiday. Customers won't be able to book on this date."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-2 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Date</label>
                <div className="p-2 bg-gray-50 rounded-md text-center">
                  {format(date, 'MMMM d, yyyy')}
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea 
                  placeholder="Add description for this holiday"
                  value={holidayDescription}
                  onChange={(e) => setHolidayDescription(e.target.value)}
                  className="resize-none"
                />
              </div>
              
              <DialogFooter className="flex gap-2">
                {isHoliday(date) && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      onRemoveHoliday();
                      setHolidayDialogOpen(false);
                    }}
                  >
                    Remove
                  </Button>
                )}
                
                <Button
                  size="sm"
                  onClick={onAddHoliday}
                >
                  {isHoliday(date) ? 'Update' : 'Save'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CalendarNavigation;
