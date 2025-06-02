
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
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Appointments</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onNavigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onGoToToday}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onNavigateWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-t">
          {weekDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);
            
            return (
              <div
                key={index}
                onClick={() => onDateSelect(day)}
                className={`
                  p-4 border-r last:border-r-0 cursor-pointer transition-colors
                  ${isSelected ? 'bg-booqit-primary/10 border-booqit-primary' : 'hover:bg-gray-50'}
                `}
              >
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`
                    text-2xl font-bold mb-1
                    ${isCurrentDay ? 'bg-booqit-primary text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}
                    ${isSelected && !isCurrentDay ? 'text-booqit-primary' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">
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
