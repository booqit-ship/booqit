
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
  return (
    <Card className="mb-6 overflow-hidden shadow-sm">
      <CardHeader className="bg-gradient-to-r from-booqit-primary/5 to-booqit-primary/10 py-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-booqit-dark text-base sm:text-lg">Your Appointments</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onNavigateWeek('prev')}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium px-2"
              onClick={onGoToToday}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onNavigateWeek('next')}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="flex w-full">
          {weekDays.map((day, index) => {
            const isCurrentDay = isToday(day);
            const isSelectedDay = isSameDay(day, selectedDate);
            
            return (
              <div 
                key={index}
                onClick={() => onDateSelect(day)}
                className={`
                  flex-1 transition-all cursor-pointer border-r last:border-r-0 border-gray-100
                  ${isSelectedDay ? 'bg-purple-100 ring-1 ring-inset ring-booqit-primary z-10' : ''}
                  hover:bg-gray-50
                `}
              >
                <div className={`
                  flex flex-col items-center justify-center p-1.5 sm:p-2
                  ${isCurrentDay ? 'bg-booqit-primary text-white' : ''}
                `}>
                  <div className="text-[10px] xs:text-xs sm:text-xs uppercase font-medium tracking-wider">
                    {format(day, 'EEE')}
                  </div>
                  <div className="text-base xs:text-lg sm:text-xl font-bold my-0.5">
                    {format(day, 'd')}
                  </div>
                  <div className="text-[10px] xs:text-xs sm:text-xs">
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
