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
      if (!user) return;

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          merchant:merchants!inner(shop_name, address, image_url),
          service:services!inner(name, duration)
        `)
        .eq('user_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .or(`date.gt.${currentDate},and(date.eq.${currentDate},time_slot.gt.${currentTime})`)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching next booking:', error);
        return;
      }

      // Type cast the status to ensure it matches our interface
      if (data) {
        const typedBooking = {
          ...data,
          status: data.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'
        } as BookingWithDetails;
        setNextBooking(typedBooking);
      } else {
        setNextBooking(null);
      }
    } catch (error) {
      console.error('Error fetching next upcoming booking:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextUpcomingBooking();
    
    // Refresh every minute to check if the current booking has passed
    const interval = setInterval(fetchNextUpcomingBooking, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const getShopImage = (merchant: BookingWithDetails['merchant']) => {
    if (merchant.image_url && merchant.image_url.trim() !== '') {
      if (merchant.image_url.startsWith('http')) {
        return merchant.image_url;
      }
      return `https://ggclvurfcykbwmhfftkn.supabase.co/storage/v1/object/public/merchant_images/${merchant.image_url}`;
    }
    return 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
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

        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            {/* Larger Shop Image */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-lg overflow-hidden">
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
            
            {/* Text Content on Right Side */}
            <div className="flex-1 min-w-0">
              {/* Shop Name & Service */}
              <div className="mb-2">
                <h3 className="text-base font-bold text-gray-900 truncate">
                  {nextBooking.merchant.shop_name}
                </h3>
                <p className="text-booqit-primary font-medium text-sm truncate">
                  {nextBooking.service.name}
                </p>
              </div>
              
              {/* Date & Time in Grid */}
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">
                    {formatDateInIST(new Date(nextBooking.date), 'MMM d')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">
                    {formatTimeToAmPm(nextBooking.time_slot)}
                  </span>
                </div>
              </div>

              {/* Stylist Name */}
              {nextBooking.stylist_name && (
                <div className="flex items-center space-x-1 mb-2">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-600">
                    {nextBooking.stylist_name}
                  </span>
                </div>
              )}

              {/* Action Hint */}
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center">
                  <span className="mr-1">👆</span>
                  Tap to view details
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpcomingBookings;
