
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Flag, CalendarX, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface HolidayDate {
  id: string;
  holiday_date: string;
  description: string | null;
}

interface HolidayManagerProps {
  holidays: HolidayDate[];
  isLoading: boolean;
  onDeleteHoliday: (holidayId: string) => void;
}

const HolidayManager: React.FC<HolidayManagerProps> = ({
  holidays,
  isLoading,
  onDeleteHoliday,
}) => {
  return (
    <Card>
      <CardHeader className="py-2">
        <CardTitle className="text-base sm:text-lg flex items-center">
          <Flag className="mr-2 h-4 w-4 text-red-500" />
          Shop Holidays
        </CardTitle>
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
                        {format(parseISO(holiday.holiday_date), 'MMM dd, yyyy')}
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
