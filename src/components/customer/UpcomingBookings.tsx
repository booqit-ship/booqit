
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Store, Scissors, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatTimeToAmPm } from '@/utils/timeUtils';

const UpcomingBookings: React.FC = () => {
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userId } = useAuth();
  const navigate = useNavigate();

  const fetchUpcomingBookings = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
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
        .in('status', ['confirmed', 'pending'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true })
        .limit(3);
        
      if (error) throw error;
      
      setUpcomingBookings(data as Booking[] || []);
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingBookings();
  }, [userId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handleViewAllBookings = () => {
    navigate('/calendar');
  };

  const handleBookNow = () => {
    navigate('/search');
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-booqit-primary" />
            Upcoming Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-booqit-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-booqit-primary" />
            Upcoming Appointments
          </CardTitle>
          {upcomingBookings.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleViewAllBookings}
              className="text-booqit-primary hover:text-booqit-primary/80"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {upcomingBookings.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <Calendar className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm mb-3">No upcoming appointments</p>
            <Button 
              size="sm"
              className="bg-booqit-primary hover:bg-booqit-primary/90" 
              onClick={handleBookNow}
            >
              Book Now
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map(booking => (
              <Card key={booking.id} className="border border-gray-200 shadow-none hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="bg-booqit-primary/10 p-2 rounded-full">
                        <Clock className="h-4 w-4 text-booqit-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">
                          {booking.service?.name}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <span>{format(parseISO(booking.date), 'MMM dd')}</span>
                          <span>•</span>
                          <span className="text-booqit-primary font-medium">
                            {formatTimeToAmPm(booking.time_slot)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Store className="h-3 w-3" />
                          <span className="truncate">{booking.merchant?.shop_name}</span>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      className={`${getStatusColor(booking.status)} text-white border-0 text-xs ml-2`}
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  
                  {booking.stylist_name && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 ml-11">
                      <Scissors className="h-3 w-3" />
                      <span>with {booking.stylist_name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingBookings;
