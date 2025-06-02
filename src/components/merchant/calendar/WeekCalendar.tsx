
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, isSameDay } from 'date-fns';

interface WeekCalendarProps {
  weekDays: Date[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
}

const WeekCalendar: React.FC<WeekCalendarProps> = ({
  weekDays,
  selectedDate,
  onDateSelect,
  onNavigateWeek,
  onGoToToday,
}) => {
  // Show only 5 days (weekdays)
  const displayDays = weekDays.slice(0, 5);

  return (
    <Card className="mb-6 overflow-hidden shadow-sm">
      <CardHeader className="bg-gradient-to-r from-booqit-primary/5 to-booqit-primary/10 py-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-booqit-dark text-xl sm:text-2xl">Your Appointments</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onNavigateWeek('prev')}
              className="h-10 px-4"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="h-10 text-sm font-medium px-4"
              onClick={onGoToToday}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onNavigateWeek('next')}
              className="h-10 px-4"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="flex w-full">
          {displayDays.map((day, index) => {
            const isCurrentDay = isToday(day);
            const isSelectedDay = isSameDay(day, selectedDate);
            
            return (
              <div 
                key={index}
                onClick={() => onDateSelect(day)}
                className={`
                  flex-1 transition-all cursor-pointer border-r last:border-r-0 border-gray-100
                  ${isSelectedDay ? 'bg-purple-100 ring-2 ring-inset ring-booqit-primary z-10' : ''}
                  hover:bg-gray-50
                `}
              >
                <div className={`
                  flex flex-col items-center justify-center py-6 px-4 sm:py-8 sm:px-6
                  ${isCurrentDay ? 'bg-booqit-primary text-white' : ''}
                `}>
                  <div className="text-sm sm:text-base uppercase font-medium tracking-wider mb-2">
                    {format(day, 'EEE')}
                  </div>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold my-2">
                    {format(day, 'd')}
                  </div>
                  <div className="text-sm sm:text-base">
                    {format(day, 'MMM')}
                  </div>
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
