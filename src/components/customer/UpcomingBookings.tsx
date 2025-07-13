import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Clock, MapPin, User } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import { useNavigate } from 'react-router-dom';

interface BookingWithDetails {
  id: string;
  user_id: string;
  merchant_id: string;
  service_id: string;
  date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: string;
  created_at: string;
  staff_id?: string | null;
  stylist_name?: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  merchant: {
    shop_name: string;
    address: string;
    image_url?: string;
  };
  service: {
    name: string;
    duration: number;
  };
}

const UpcomingBookings: React.FC = () => {
  const [nextBooking, setNextBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNextUpcomingBooking = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        setNextBooking(null);
        return;
      }

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

      console.log('Fetching bookings for user:', user.id);
      console.log('Current date/time:', currentDate, currentTime);

      // First get future date bookings
      const { data: futureDateBookings, error: futureDateError } = await supabase
        .from('bookings')
        .select(`
          *,
          merchant:merchants!inner(shop_name, address, image_url),
          service:services!inner(name, duration)
        `)
        .eq('user_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .gt('date', currentDate)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true })
        .limit(5);

      if (futureDateError) {
        console.error('Error fetching future date bookings:', futureDateError);
      }

      // Then get today's bookings with time filter
      const { data: todayBookings, error: todayError } = await supabase
        .from('bookings')
        .select(`
          *,
          merchant:merchants!inner(shop_name, address, image_url),
          service:services!inner(name, duration)
        `)
        .eq('user_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .eq('date', currentDate)
        .gt('time_slot', currentTime)
        .order('time_slot', { ascending: true })
        .limit(5);

      if (todayError) {
        console.error('Error fetching today bookings:', todayError);
      }

      // Combine and sort all bookings
      const allBookings = [
        ...(todayBookings || []),
        ...(futureDateBookings || [])
      ];

      console.log('Found bookings:', allBookings.length);

      if (allBookings.length > 0) {
        // Sort by date and time
        allBookings.sort((a, b) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.time_slot.localeCompare(b.time_slot);
        });

        const nextBookingData = allBookings[0];
        const typedBooking = {
          ...nextBookingData,
          status: nextBookingData.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'
        } as BookingWithDetails;
        
        console.log('Next booking found:', typedBooking.id);
        setNextBooking(typedBooking);
      } else {
        console.log('No upcoming bookings found');
        setNextBooking(null);
      }
    } catch (error) {
      console.error('Error fetching next upcoming booking:', error);
      setNextBooking(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextUpcomingBooking();
    
    // Refresh every 5 minutes instead of every minute to reduce API calls
    const interval = setInterval(fetchNextUpcomingBooking, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getShopImage = (merchant: BookingWithDetails['merchant']) => {
    if (merchant.image_url && merchant.image_url.trim() !== '') {
      // Handle full URLs
      if (merchant.image_url.startsWith('http')) {
        return merchant.image_url;
      }
      // Handle Supabase storage URLs - check if it's already a full storage URL
      if (merchant.image_url.includes('supabase.co/storage')) {
        return merchant.image_url;
      }
      // Handle relative paths for Supabase storage
      return `https://ggclvurfcykbwmhfftkn.supabase.co/storage/v1/object/public/merchant-images/${merchant.image_url}`;
    }
    return 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop';
  };

  const handleBookingClick = () => {
    if (nextBooking) {
      navigate(`/receipt/${nextBooking.id}`);
    }
  };

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Next Appointment</h2>
        <Card className="animate-pulse bg-white shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!nextBooking) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Next Appointment</h2>
        <Card className="bg-gray-50 border-dashed border-gray-300 rounded-xl">
          <CardContent className="p-4 text-center">
            <CalendarIcon className="h-6 w-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">No upcoming bookings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Next Appointment</h2>
      <Card 
        className="bg-white shadow-sm rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleBookingClick}
      >
        {/* Status Banner */}
        <div className="bg-gradient-to-r from-booqit-primary to-purple-600 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <span className="text-white font-medium text-xs">UPCOMING</span>
            </div>
            <span className="text-white/80 text-xs">
              {nextBooking.status.toUpperCase()}
            </span>
          </div>
        </div>

        <CardContent className="p-3">
          <div className="flex items-start space-x-4">
            {/* Larger Shop Image */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-lg overflow-hidden">
                <img 
                  src={getShopImage(nextBooking.merchant)} 
                  alt={nextBooking.merchant.shop_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
                  }}
                />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Content Split: Left for shop/service, Right for date/time/stylist */}
            <div className="flex-1 flex items-start justify-between">
              {/* Left side - Shop & Service */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 truncate">
                  {nextBooking.merchant.shop_name}
                </h3>
                <p className="text-booqit-primary font-medium text-sm truncate">
                  {nextBooking.service.name}
                </p>
              </div>
              
              {/* Right side - Date, Time, Stylist (vertical stack) */}
              <div className="flex flex-col items-end space-y-2">
                {/* Date */}
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">
                    {formatDateInIST(new Date(nextBooking.date), 'MMM d')}
                  </span>
                </div>
                
                {/* Time */}
                <div className="flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">
                    {formatTimeToAmPm(nextBooking.time_slot)}
                  </span>
                </div>

                {/* Stylist Name */}
                {nextBooking.stylist_name && (
                  <div className="flex items-center space-x-1">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {nextBooking.stylist_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpcomingBookings;
