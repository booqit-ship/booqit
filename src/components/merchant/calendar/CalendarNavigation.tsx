
import React from 'react';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
      </div>
    </div>
  );
};

export default CalendarNavigation;
