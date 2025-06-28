
import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Calendar, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Merchant {
  id: string;
  shop_name: string;
  category: string;
  address: string;
  image_url: string | null;
  rating: number | null;
}

const fetchNearbyMerchants = async (): Promise<Merchant[]> => {
  const { data, error } = await supabase
    .from('merchants')
    .select('id, shop_name, category, address, image_url, rating')
    .limit(6);

  if (error) {
    console.error('Error fetching merchants:', error);
    return [];
  }

  return data || [];
};

const HomePageSkeleton = () => (
  <div className="flex flex-col space-y-6 p-4">
    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
      ))}
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
      ))}
    </div>
  </div>
);

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { firstName, isLoading: profileLoading, error: profileError } = useUserProfile();

  const {
    data: merchants = [],
    isLoading: merchantsLoading,
    error: merchantsError
  } = useQuery({
    queryKey: ['nearby-merchants'],
    queryFn: fetchNearbyMerchants,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Show loading skeleton while profile is loading
  if (profileLoading) {
    return <HomePageSkeleton />;
  }

  // If there's a profile error, show a simple fallback but don't crash
  const displayName = profileError ? 'there' : firstName;

  return (
    <div className="flex flex-col space-y-6 p-4 pb-24">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl font-righteous text-booqit-dark">
            Hi {displayName}! 👋
          </h1>
          <p className="text-booqit-dark/70 font-poppins">Ready for your next appointment?</p>
        </div>

        {/* Search Bar */}
        <Link to="/search">
          <div className="flex items-center space-x-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <Search className="h-5 w-5 text-gray-400" />
            <span className="text-gray-500 font-poppins">Search for salons, services...</span>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/search">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-booqit-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Search className="h-6 w-6 text-booqit-primary" />
              </div>
              <h3 className="font-medium text-booqit-dark">Find Salons</h3>
              <p className="text-xs text-gray-600 mt-1">Discover nearby</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/map">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium text-booqit-dark">Map View</h3>
              <p className="text-xs text-gray-600 mt-1">See locations</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/calendar">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-booqit-dark">My Calendar</h3>
              <p className="text-xs text-gray-600 mt-1">View bookings</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/bookings-history">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-medium text-booqit-dark">History</h3>
              <p className="text-xs text-gray-600 mt-1">Past visits</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Nearby Salons Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-righteous text-booqit-dark">Nearby Salons</h2>
          <Link to="/search">
            <Button variant="ghost" size="sm" className="text-booqit-primary">
              View All
            </Button>
          </Link>
        </div>

        {merchantsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : merchantsError ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-500 text-center">Unable to load nearby salons</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 mx-auto block"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : merchants.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-gray-500 text-center">No salons found nearby</p>
              <Link to="/search">
                <Button size="sm" className="mt-2 mx-auto block bg-booqit-primary">
                  Search All Salons
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {merchants.map((merchant) => (
              <Link key={merchant.id} to={`/merchant/${merchant.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                        {merchant.image_url ? (
                          <img
                            src={merchant.image_url}
                            alt={merchant.shop_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-booqit-primary/20 to-booqit-primary/10 flex items-center justify-center">
                            <span className="text-booqit-primary font-medium text-sm">
                              {merchant.shop_name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-booqit-dark truncate">
                          {merchant.shop_name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {merchant.category}
                        </p>
                        <div className="flex items-center mt-1">
                          {merchant.rating && (
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600 ml-1">
                                {merchant.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function HomePageWithSuspense() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePage />
    </Suspense>
  );
}
