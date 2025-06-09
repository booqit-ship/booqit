import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CalendarIcon, CalendarCheck, Filter } from 'lucide-react';
import { format } from 'date-fns';
import BookingCard from './BookingCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
interface BookingWithCustomerDetails {
  id: string;
  service?: {
    name: string;
    duration?: number;
  };
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string;
}
interface BookingsListProps {
  date: Date;
  bookings: BookingWithCustomerDetails[];
  isLoading: boolean;
  onStatusChange: (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => Promise<void>;
}
const BookingsList: React.FC<BookingsListProps> = ({
  date,
  bookings,
  isLoading,
  onStatusChange
}) => {
  const [selectedStylist, setSelectedStylist] = useState<string>('all');

  // Get unique stylists from bookings
  const stylists = useMemo(() => {
    const uniqueStylists = Array.from(new Set(bookings.map(booking => booking.stylist_name).filter(Boolean)));
    return uniqueStylists.sort();
  }, [bookings]);

  // Filter and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings;

    // Filter by stylist
    if (selectedStylist !== 'all') {
      filtered = filtered.filter(booking => booking.stylist_name === selectedStylist);
    }

    // Sort bookings: active bookings first (by time), then completed/cancelled at bottom
    return filtered.sort((a, b) => {
      // First, separate active vs inactive bookings
      const aIsInactive = a.status === 'completed' || a.status === 'cancelled';
      const bIsInactive = b.status === 'completed' || b.status === 'cancelled';
      if (aIsInactive && !bIsInactive) return 1; // a goes to bottom
      if (!aIsInactive && bIsInactive) return -1; // b goes to bottom

      // If both are same type (active or inactive), sort by time
      return a.time_slot.localeCompare(b.time_slot);
    });
  }, [bookings, selectedStylist]);
  return <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/30">
      <CardHeader className="bg-gradient-to-r from-booqit-primary to-booqit-primary/80 text-white rounded-t-lg py-5">
        <div className="text-xl flex items-center font-semibold">
          <CalendarCheck className="mr-3 h-6 w-6" />
          {format(date, 'MMMM d, yyyy')} Bookings
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Stylist Filter - positioned below header */}
        {stylists.length > 0 && <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{filteredAndSortedBookings.length}</span>
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filter by  - </span>
            </div>
            <Select value={selectedStylist} onValueChange={setSelectedStylist}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Stylists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stylists</SelectItem>
                {stylists.map(stylist => <SelectItem key={stylist} value={stylist}>
                    {stylist}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>}

        {isLoading ? <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-booqit-primary border-t-transparent"></div>
          </div> : filteredAndSortedBookings.length === 0 ? <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <CalendarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-xl font-medium">
              {selectedStylist === 'all' ? 'No bookings for this date' : `No bookings for ${selectedStylist} on this date`}
            </p>
            <p className="text-gray-500 text-base mt-2">
              {selectedStylist === 'all' ? 'Your schedule is free today' : 'This stylist is free today'}
            </p>
          </div> : <div className="space-y-4">
            {filteredAndSortedBookings.map(booking => <BookingCard key={booking.id} booking={booking} onStatusChange={onStatusChange} />)}
          </div>}
      </CardContent>
    </Card>;
};
export default BookingsList;