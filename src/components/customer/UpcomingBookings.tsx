
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
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Next Appointment</h2>
        <Card className="animate-pulse bg-white shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-200 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!nextBooking) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Next Appointment</h2>
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No upcoming bookings</h3>
            <p className="text-gray-500 leading-relaxed">When you book appointments, your next one will appear here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Next Appointment</h2>
      <Card 
        className="bg-white shadow-xl rounded-2xl overflow-hidden border-0 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        onClick={handleBookingClick}
      >
        {/* Status Banner */}
        <div className="bg-gradient-to-r from-booqit-primary to-purple-600 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white font-medium text-sm">UPCOMING</span>
            </div>
            <span className="text-white/80 text-xs font-medium">
              {nextBooking.status.toUpperCase()}
            </span>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            {/* Shop Image */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md">
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
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            {/* Booking Details */}
            <div className="flex-1 min-w-0">
              {/* Shop Name & Service */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">
                  {nextBooking.merchant.shop_name}
                </h3>
                <p className="text-booqit-primary font-semibold text-base truncate">
                  {nextBooking.service.name}
                </p>
              </div>
              
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatDateInIST(new Date(nextBooking.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatTimeToAmPm(nextBooking.time_slot)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-2">
                {nextBooking.stylist_name && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Stylist: <span className="font-medium text-gray-800">{nextBooking.stylist_name}</span>
                    </span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 truncate">
                    {nextBooking.merchant.address}
                  </span>
                </div>
              </div>

              {/* Action Hint */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center justify-center">
                  <span className="mr-1">👆</span>
                  Tap to view booking details
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
