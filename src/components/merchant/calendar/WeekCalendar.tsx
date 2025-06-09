
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, isSameDay, addDays, startOfDay } from 'date-fns';

interface WeekCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onNavigateDay: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
  appointmentCounts?: {
    [date: string]: number;
  };
  holidays?: Array<{
    holiday_date: string;
    description?: string | null;
  }>;
}

const WeekCalendar: React.FC<WeekCalendarProps> = ({
  selectedDate,
  onDateSelect,
  onNavigateDay,
  onGoToToday,
  appointmentCounts = {},
  holidays = []
}) => {
  // Generate 5 days starting from the selected date or a base date
  const weekDays = React.useMemo(() => {
    // Find the start of the week containing the selected date
    const today = new Date();
    const isSelectedToday = isSameDay(selectedDate, today);
    
    if (isSelectedToday) {
      // If selected date is today, show today + next 4 days
      return Array.from({ length: 5 }, (_, i) => addDays(today, i));
    } else {
      // If selected date is not today, center the 5-day view around it
      return Array.from({ length: 5 }, (_, i) => addDays(selectedDate, i - 2));
    }
  }, [selectedDate]);

  // Check if a date is a holiday
  const isHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.some(holiday => holiday.holiday_date === dateStr);
  };

  return (
    <Card className="mb-6 overflow-hidden shadow-sm">
      <CardHeader className="bg-gradient-to-r from-booqit-primary/5 to-booqit-primary/10 py-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-booqit-dark text-xl font-light">Calendar</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => onNavigateDay('prev')} className="h-8 px-3">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs font-medium px-3" onClick={onGoToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigateDay('next')} className="h-8 px-3">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="grid grid-cols-5 gap-2">
          {weekDays.map((day, index) => {
            const isCurrentDay = isToday(day);
            const isSelectedDay = isSameDay(day, selectedDate);
            const isHolidayDay = isHoliday(day);
            const dateKey = format(day, 'yyyy-MM-dd');
            const appointmentCount = appointmentCounts[dateKey] || 0;
            
            return (
              <div key={index} className="flex flex-col items-center cursor-pointer" onClick={() => onDateSelect(day)}>
                <div className={`
                  w-full h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-200
                  ${isSelectedDay ? 'bg-booqit-primary text-white shadow-lg border-2 border-booqit-primary' : 
                    isHolidayDay ? 'bg-red-500 text-white border-2 border-red-600' :
                    isCurrentDay ? 'bg-booqit-primary/20 text-booqit-primary border-2 border-booqit-primary/30' : 
                    'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'}
                `}>
                  <div className="text-xs font-medium uppercase tracking-wide">
                    {format(day, 'EEE')}
                  </div>
                  <div className="text-lg font-bold">
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs">
                    {format(day, 'MMM')}
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {isHolidayDay ? (
                    <span className="text-red-500 font-medium">Holiday</span>
                  ) : appointmentCount > 0 ? (
                    `${appointmentCount} apt${appointmentCount > 1 ? 's' : ''}`
                  ) : (
                    'No apt'
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeekCalendar;
