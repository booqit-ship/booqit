
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp, Clock } from 'lucide-react';

interface BookingStatsProps {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  todaysEarning?: number;
}

const BookingStats: React.FC<BookingStatsProps> = ({
  total,
  pending,
  confirmed,
  completed,
  todaysEarning = 0,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <Users className="h-8 w-8 text-booqit-primary" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Today's Earning</p>
              <p className="text-2xl font-bold text-green-600">₹{todaysEarning}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Confirmed</p>
              <p className="text-2xl font-bold text-blue-600">{confirmed}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completed}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingStats;
