
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Star, Calendar, Settings, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

const HomePage = () => {
  const navigate = useNavigate();
  const { firstName, isLoading: profileLoading } = useUserProfile();

  // Fetch nearby merchants
  const { data: merchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ['nearby-merchants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch user's recent bookings
  const { data: recentBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['recent-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          merchants(shop_name, address, image_url),
          services(name, price)
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    }
  });

  const displayName = profileLoading ? 'Loading...' : (firstName || 'Customer');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-righteous text-booqit-dark">
              Hi {displayName}! 👋
            </h1>
            <p className="text-gray-600 font-poppins text-sm">
              Ready to book your next appointment?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
              className="rounded-full"
            >
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="rounded-full"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-16 bg-booqit-primary hover:bg-booqit-primary/90"
            onClick={() => navigate('/search')}
          >
            <div className="flex flex-col items-center gap-1">
              <MapPin className="h-5 w-5" />
              <span className="text-sm font-poppins">Find Salons</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-16 border-booqit-primary text-booqit-primary hover:bg-booqit-primary/10"
            onClick={() => navigate('/bookings')}
          >
            <div className="flex flex-col items-center gap-1">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-poppins">My Bookings</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Recent Bookings */}
      {!bookingsLoading && recentBookings && recentBookings.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-righteous text-booqit-dark">Recent Bookings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/bookings')}
              className="text-booqit-primary"
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-righteous text-booqit-dark mb-1">
                        {booking.merchants?.shop_name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {booking.services?.name}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(booking.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {booking.time_slot}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Salons */}
      <div className="px-4">
        <h2 className="text-lg font-righteous text-booqit-dark mb-3">
          Popular Salons Near You
        </h2>
        {merchantsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {merchants?.map((merchant) => (
              <motion.div
                key={merchant.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/salon/${merchant.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-righteous text-booqit-dark mb-1">
                          {merchant.shop_name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {merchant.category}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {merchant.address?.substring(0, 30)}...
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {merchant.rating || '4.5'}
                          </div>
                        </div>
                      </div>
                      {merchant.image_url && (
                        <img
                          src={merchant.image_url}
                          alt={merchant.shop_name}
                          className="w-12 h-12 rounded-lg object-cover ml-3"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
