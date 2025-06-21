
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Merchant } from "@/types";
import { MapPin, Star, Clock } from "lucide-react";
import UpcomingBookings from "@/components/customer/UpcomingBookings";
import { RobustApiClient } from "@/utils/robustApiClient";
import { BackendHealthCheck } from "@/utils/backendHealthCheck";

const HomePage = () => {
  const { user, loading: authLoading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');

  // Check backend health on component mount
  useEffect(() => {
    const checkHealth = async () => {
      const health = await BackendHealthCheck.checkHealth();
      setConnectionStatus(health.isHealthy ? 'healthy' : 'unhealthy');
    };
    checkHealth();
  }, []);

  const { data: nearbyMerchants = [], isLoading: merchantsLoading, error: merchantsError } = useQuery({
    queryKey: ['nearby-merchants'],
    queryFn: async () => {
      return RobustApiClient.safeQuery(async () => {
        const { data, error } = await supabase
          .from('merchants')
          .select('*')
          .limit(6);
        
        return { data: data || [], error };
      });
    },
    enabled: connectionStatus === 'healthy',
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-booqit-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 font-poppins">Loading...</p>
        </div>
      </div>
    );
  }

  const showLoading = merchantsLoading && connectionStatus === 'checking';
  const showError = merchantsError || connectionStatus === 'unhealthy';

  return (
    <div className="min-h-screen bg-gradient-to-br from-booqit-primary/5 to-white">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-righteous text-gray-800">
            Welcome back{user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ''}!
          </h1>
          <p className="text-gray-600 font-poppins">Find and book your favorite services</p>
        </div>

        {/* Upcoming Bookings */}
        <UpcomingBookings />

        {/* Nearby Shops Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-righteous text-gray-800">Shops Near You</h2>
            <button className="text-booqit-primary font-poppins text-sm hover:underline">
              View All
            </button>
          </div>

          {showError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800 font-poppins">
                {connectionStatus === 'unhealthy' 
                  ? 'Connection issue - Unable to load shops right now'
                  : 'Unable to load nearby shops. Please try again later.'
                }
              </p>
            </div>
          )}

          {showLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                  <div className="h-32 bg-gray-200 rounded-lg mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          )}

          {!showLoading && !showError && nearbyMerchants.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbyMerchants.map((merchant: Merchant) => (
                <div
                  key={merchant.id}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = `/merchant/${merchant.id}`}
                >
                  <div className="h-32 bg-gradient-to-r from-booqit-primary/10 to-booqit-secondary/10 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-2xl">🏪</span>
                  </div>
                  <h3 className="font-righteous text-gray-800 mb-1">
                    {merchant.shop_name || 'Shop Name'}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="font-poppins">
                      {merchant.address || 'Location not specified'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-yellow-500">
                      <Star className="h-4 w-4 mr-1" />
                      <span className="font-poppins">4.5</span>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="font-poppins">
                        {merchant.open_time || '9:00'} - {merchant.close_time || '18:00'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showLoading && !showError && nearbyMerchants.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 font-poppins">No shops found in your area</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
