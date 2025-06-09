
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CalendarIcon, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import BookingCard from './BookingCard';

interface BookingService {
  service_id: string;
  service_name: string;
  service_duration: number;
  service_price: number;
}

interface BookingWithServicesDetails {
  id: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string;
  services: BookingService[];
  total_duration: number;
  total_price: number;
}

interface BookingsListProps {
  date: Date;
  bookings: BookingWithServicesDetails[];
  isLoading: boolean;
  onStatusChange: (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => Promise<void>;
}

const BookingsList: React.FC<BookingsListProps> = ({
  date,
  bookings,
  isLoading,
  onStatusChange,
}) => {
  // Show all bookings except cancelled ones
  const visibleBookings = bookings.filter(booking => booking.status !== 'cancelled');

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/30">
      <CardHeader className="bg-gradient-to-r from-booqit-primary to-booqit-primary/80 text-white rounded-t-lg py-5">
        <div className="text-xl flex items-center font-semibold">
          <CalendarCheck className="mr-3 h-6 w-6" />
          {format(date, 'MMMM d, yyyy')} Bookings
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-booqit-primary border-t-transparent"></div>
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <CalendarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-xl font-medium">No bookings for this date</p>
            <p className="text-gray-500 text-base mt-2">Your schedule is free today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingsList;
