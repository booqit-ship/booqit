
import React from 'react';
import { format, isSameDay } from 'date-fns';

interface CalendarDaysProps {
  visibleDays: Date[];
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  isHoliday: (date: Date) => boolean;
  getBookingsCountForDay: (date: Date) => number;
}

const CalendarDays: React.FC<CalendarDaysProps> = ({
  visibleDays,
  currentDate,
  selectedDate,
  onDateSelect,
  isHoliday,
  getBookingsCountForDay,
}) => {
  return (
    <div className="flex w-full">
      {visibleDays.map((day, index) => {
        const isCurrentDay = isSameDay(day, currentDate);
        const isSelectedDay = isSameDay(day, selectedDate);
        const isHolidayDay = isHoliday(day);
        const bookingsCount = getBookingsCountForDay(day);
        
        return (
          <div 
            key={index}
            onClick={() => !isHolidayDay && onDateSelect(day)}
            className={`
              flex-1 transition-all cursor-pointer border-r last:border-r-0 border-gray-100
              ${isSelectedDay ? 'bg-purple-100 ring-1 ring-inset ring-booqit-primary z-10' : ''}
              ${isHolidayDay ? 'cursor-not-allowed' : 'hover:bg-gray-50'}
            `}
          >
            <div className={`
              flex flex-col items-center justify-center p-1.5 sm:p-2
              ${isCurrentDay ? 'bg-booqit-primary text-white' : ''}
              ${isHolidayDay ? 'bg-red-500 text-white' : ''}
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
            
            <div className="py-1 px-1 text-center text-[10px] xs:text-xs sm:text-xs font-medium">
              {isHolidayDay ? (
                <span className="text-red-500 text-[9px] xs:text-xs">Holiday</span>
              ) : bookingsCount > 0 ? (
                <span className="text-[9px] xs:text-xs">{bookingsCount} {bookingsCount === 1 ? 'appt' : 'appts'}</span>
              ) : (
                <span className="text-gray-400 text-[9px] xs:text-xs">-</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarDays;
