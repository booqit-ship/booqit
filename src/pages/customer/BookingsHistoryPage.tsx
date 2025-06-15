
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Store, ArrowLeft, Scissors, Loader2 } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import CancelBookingButton from '@/components/customer/CancelBookingButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BookingsHistoryPage: React.FC = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Helper function to get service names from services JSON
  const getServiceNames = (booking: Booking): string => {
    if (booking.services) {
      try {
        const services = typeof booking.services === 'string' 
          ? JSON.parse(booking.services) 
          : booking.services;
        
        if (Array.isArray(services)) {
          return services.map(service => service.name).join(', ');
        }
      } catch (error) {
        console.error('Error parsing services JSON:', error);
      }
    }
    
    return booking.service?.name || 'Service';
  };

  // Helper function to parse services for navigation
  const parseServicesForNavigation = (booking: Booking) => {
    if (booking.services) {
      try {
        const services = typeof booking.services === 'string' 
          ? JSON.parse(booking.services) 
          : booking.services;
        
        if (Array.isArray(services)) {
          return services;
        } else if (services && typeof services === 'object') {
          return [services];
        }
      } catch (error) {
        console.error('Error parsing services JSON:', error);
      }
    }
    
    if (booking.service) {
      return [booking.service];
    }
    
    return [];
  };

  // Fetch all bookings
  const { data: bookings = [], isFetching, refetch } = useQuery({
    queryKey: ['bookings-history', userId],
    queryFn: async (): Promise<Booking[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          stylist_name,
          service:service_id (
            id,
            name,
            price,
            duration,
            description,
            merchant_id,
            created_at,
            image_url
          ),
          merchant:merchant_id (
            id,
            shop_name,
            address,
            image_url,
            user_id,
            description,
            category,
            gender_focus,
            lat,
            lng,
            open_time,
            close_time,
            rating,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('time_slot', { ascending: false });
      
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter(booking => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  // Navigate to receipt page with proper services data
  const handleViewReceipt = (booking: Booking) => {
    const services = parseServicesForNavigation(booking);
    navigate(`/receipt/${booking.id}`, {
      state: {
        booking: {
          ...booking,
          services: services
        },
        selectedServices: services,
        merchant: booking.merchant
      }
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="p-2 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-booqit-primary" />
              <h1 className="text-2xl font-semibold text-gray-900">My Bookings</h1>
            </div>
          </div>
          <p className="text-gray-600 ml-11">View your booking history</p>
        </div>

        {/* Filter Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bookings</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-500">
                ({filteredBookings.length})
              </span>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {isFetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-booqit-primary" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="p-6">
              <CalendarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {statusFilter === 'all' ? 'No bookings yet' : `No ${statusFilter} bookings`}
              </h3>
              <p className="text-gray-500 mb-4">
                {statusFilter === 'all' 
                  ? 'Start booking appointments to see them here'
                  : `You don't have any ${statusFilter} bookings`
                }
              </p>
              {statusFilter === 'all' && (
                <Button 
                  className="bg-booqit-primary hover:bg-booqit-primary/90" 
                  onClick={() => navigate('/search')}
                >
                  Book an Appointment
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map(booking => (
              <Card key={booking.id} className="border-l-4 border-l-booqit-primary shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="bg-booqit-primary/10 p-2 rounded-full flex-shrink-0">
                        <Clock className="h-4 w-4 text-booqit-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-medium text-lg mb-1">{getServiceNames(booking)}</h3>
                        <div className="text-sm text-booqit-primary font-medium mb-2">
                          {format(parseISO(booking.date), 'MMM d, yyyy')} at {formatTimeToAmPm(booking.time_slot)}
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(booking.status)} text-white border-0 flex-shrink-0 ml-2`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4 ml-11">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Store className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{booking.merchant?.shop_name}</span>
                    </div>
                    
                    {booking.stylist_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Scissors className="h-4 w-4 flex-shrink-0" />
                        <span>Stylist: {booking.stylist_name}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleViewReceipt(booking)} 
                      className="h-8 text-sm"
                    >
                      Receipt
                    </Button>
                    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <CancelBookingButton 
                        bookingId={booking.id} 
                        onCancelled={refetch}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsHistoryPage;
