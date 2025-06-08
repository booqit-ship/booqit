
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CalendarIcon, CalendarCheck, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BookingCard from './BookingCard';

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
    const uniqueStylists = [...new Set(bookings.map(booking => booking.stylist_name).filter(Boolean))];
    return uniqueStylists;
  }, [bookings]);

  // Filter and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = bookings || [];
    
    // Filter by stylist if selected
    if (selectedStylist !== 'all') {
      filtered = filtered.filter(booking => booking.stylist_name === selectedStylist);
    }
    
    // Sort bookings: completed ones go to bottom, others sorted by time
    const sortedBookings = filtered.sort((a, b) => {
      // If one is completed and the other isn't, completed goes to bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      
      // If both have same completion status, sort by time
      return a.time_slot.localeCompare(b.time_slot);
    });
    
    return sortedBookings;
  }, [bookings, selectedStylist]);

  console.log('BookingsList render:', {
    date: format(date, 'yyyy-MM-dd'),
    bookingsCount: filteredAndSortedBookings.length,
    isLoading,
    selectedStylist,
    stylists
  });

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/30">
      <CardHeader className="bg-gradient-to-r from-booqit-primary to-booqit-primary/80 text-white rounded-t-lg py-5">
        <div className="text-xl flex items-center justify-between font-semibold">
          <div className="flex items-center">
            <CalendarCheck className="mr-3 h-6 w-6" />
            {format(date, 'MMMM d, yyyy')} Bookings
            {!isLoading && filteredAndSortedBookings.length > 0 && (
              <span className="ml-2 text-sm bg-white/20 px-2 py-1 rounded">
                {filteredAndSortedBookings.length}
              </span>
            )}
          </div>
          
          {/* Stylist Filter */}
          {stylists.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={selectedStylist} onValueChange={setSelectedStylist}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Filter by stylist" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Stylists</SelectItem>
                  {stylists.map((stylist) => (
                    <SelectItem key={stylist} value={stylist}>
                      {stylist}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-booqit-primary border-t-transparent"></div>
          </div>
        ) : filteredAndSortedBookings.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <CalendarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-xl font-medium">
              {selectedStylist === 'all' 
                ? 'No bookings for this date' 
                : `No bookings for ${selectedStylist} on this date`
              }
            </p>
            <p className="text-gray-500 text-base mt-2">
              {selectedStylist === 'all' 
                ? 'Your schedule is free today' 
                : 'This stylist has no appointments today'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedBookings.map((booking) => (
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
