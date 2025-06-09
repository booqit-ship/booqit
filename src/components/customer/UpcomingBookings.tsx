
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Clock, Package, Timer } from 'lucide-react';
import { formatTimeToAmPm, timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import { formatDateInIST } from '@/utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { BookingWithServices } from '@/types/booking';

const UpcomingBookings: React.FC = () => {
  const [nextBooking, setNextBooking] = useState<BookingWithServices | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getTimeRange = (booking: BookingWithServices) => {
    if (!booking.total_duration || booking.total_duration === 0) {
      return formatTimeToAmPm(booking.time_slot);
    }
    
    const startMinutes = timeToMinutes(booking.time_slot);
    const endMinutes = startMinutes + booking.total_duration;
    const endTime = minutesToTime(endMinutes);
    
    return `${formatTimeToAmPm(booking.time_slot)} - ${formatTimeToAmPm(endTime)}`;
  };

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
          merchant:merchants!inner(shop_name, address, image_url)
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

      if (data) {
        // Fetch services for this booking
        const { data: servicesData, error: servicesError } = await supabase
          .rpc('get_booking_services', { p_booking_id: data.id });

        if (servicesError) {
          console.error('Error fetching booking services:', servicesError);
        }

        const services = servicesData || [];
        const total_duration = services.reduce((sum: number, s: any) => sum + (s.service_duration || 0), 0);
        const total_price = services.reduce((sum: number, s: any) => sum + (s.service_price || 0), 0);

        const typedBooking: BookingWithServices = {
          ...data,
          status: data.status as 'pending' | 'confirmed' | 'completed' | 'cancelled',
          services: services.map((s: any) => ({
            service_id: s.service_id,
            service_name: s.service_name,
            service_duration: s.service_duration,
            service_price: s.service_price
          })),
          total_duration,
          total_price,
          merchant: data.merchant
        };
        
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
    
    const interval = setInterval(fetchNextUpcomingBooking, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const getShopImage = (merchant: BookingWithServices['merchant']) => {
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
        <h2 className="text-xl font-normal mb-4">Next Appointment</h2>
        <Card className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
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
        <h2 className="text-xl font-normal mb-4">Next Appointment</h2>
        <Card className="bg-gray-50 border-dashed border-2 border-gray-200">
          <CardContent className="p-6 text-center">
            <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming bookings</h3>
            <p className="text-gray-500">When you book appointments, your next one will appear here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-normal mb-4">Next Appointment</h2>
      <Card 
        className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 cursor-pointer border-l-4 border-l-booqit-primary bg-gradient-to-r from-white to-gray-50/30"
        onClick={handleBookingClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            {/* Shop Image */}
            <div className="w-16 h-16 flex-shrink-0">
              <img 
                src={getShopImage(nextBooking.merchant)} 
                alt={nextBooking.merchant.shop_name}
                className="w-full h-full object-cover rounded-lg shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
                }}
              />
            </div>
            
            {/* Booking Details */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-gray-900 truncate">
                  {nextBooking.merchant.shop_name}
                </h3>
                <div className="flex items-center text-xs text-gray-500 bg-booqit-primary/10 px-2 py-1 rounded-full ml-2">
                  <div className="w-2 h-2 bg-booqit-primary rounded-full mr-1 animate-pulse"></div>
                  Next
                </div>
              </div>
              
              {/* Services information */}
              {nextBooking.services && nextBooking.services.length > 0 && (
                <div className="mb-3 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-booqit-primary" />
                    <span className="text-sm font-medium text-gray-700">
                      {nextBooking.services.length === 1 ? '1 Service' : `${nextBooking.services.length} Services`}
                    </span>
                  </div>
                  
                  {nextBooking.services.slice(0, 2).map((service) => (
                    <div key={service.service_id} className="ml-6 text-sm text-gray-600">
                      {service.service_name} ({service.service_duration} min)
                    </div>
                  ))}
                  
                  {nextBooking.services.length > 2 && (
                    <div className="ml-6 text-sm text-gray-500">
                      +{nextBooking.services.length - 2} more service{nextBooking.services.length > 3 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <CalendarIcon className="h-4 w-4 mr-1.5 text-booqit-primary" />
                  <span className="font-medium">
                    {formatDateInIST(new Date(nextBooking.date), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-700">
                  <Clock className="h-4 w-4 mr-1.5 text-booqit-primary" />
                  <span className="font-medium">
                    {getTimeRange(nextBooking)}
                  </span>
                </div>
              </div>
              
              {/* Total duration and price */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Timer className="h-4 w-4 text-booqit-primary" />
                  <span>{nextBooking.total_duration} min total</span>
                </div>
                <span className="text-sm font-semibold text-booqit-primary">
                  ₹{nextBooking.total_price}
                </span>
              </div>
              
              {nextBooking.stylist_name && (
                <div className="mt-2 text-xs text-gray-500">
                  Stylist: {nextBooking.stylist_name}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpcomingBookings;
