import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import UpcomingBookings from '@/components/customer/UpcomingBookings';
import LazyGoogleMap from '@/components/customer/LazyGoogleMap';
import OptimizedShopsList from '@/components/customer/OptimizedShopsList';
import { useOptimizedMerchants } from '@/hooks/useOptimizedMerchants';
import { useOptimizedUserProfile } from '@/hooks/useOptimizedUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';

const featuredCategories = [{
  id: 1,
  name: 'Salon',
  image: '/lovable-uploads/1d496057-4a0b-4339-89fb-5545663e72d2.png',
  color: '#7E57C2'
}, {
  id: 2,
  name: 'Beauty Parlour',
  image: '/lovable-uploads/97bda84f-4d96-439c-8e76-204958874286.png',
  color: '#FF6B6B'
}];

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Merchant[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("Loading location...");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();

  // Use optimized hooks
  const { userName, userAvatar } = useOptimizedUserProfile();
  const { merchants, isLoading } = useOptimizedMerchants(userLocation);

  // Filter merchants by category - memoized to prevent unnecessary recalculations
  const filteredMerchants = useMemo(() => {
    if (!activeCategory) return merchants;
    
    let dbCategory = activeCategory;
    if (activeCategory === "Salon") {
      dbCategory = "barber_shop";
    } else if (activeCategory === "Beauty Parlour") {
      dbCategory = "beauty_parlour";
    }
    
    return merchants.filter(shop => 
      shop.category.toLowerCase() === dbCategory.toLowerCase()
    );
  }, [merchants, activeCategory]);

  // Memoized distance calculation function
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
  }, []);

  const deg2rad = useCallback((deg: number) => {
    return deg * (Math.PI / 180);
  }, []);

  // Get user location with better caching
  useEffect(() => {
    const getLocationFromCache = () => {
      try {
        const cached = sessionStorage.getItem('user_location');
        if (cached) {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 10 * 60 * 1000) { // 10 minutes cache
            setUserLocation(data.location);
            setLocationName(data.locationName || "Your area");
            return true;
          }
        }
      } catch {
        return false;
      }
      return false;
    };

    if (getLocationFromCache()) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userLoc);

          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLoc.lat},${userLoc.lng}&key=AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc`
            );
            const data = await response.json();
            
            if (data.status === 'OK' && data.results?.[0]) {
              const addressComponents = data.results[0].address_components;
              const neighborhood = addressComponents.find((component: any) => 
                component.types.includes('sublocality_level_1') || 
                component.types.includes('neighborhood')
              );
              const cityComponent = addressComponents.find((component: any) => 
                component.types.includes('locality') || 
                component.types.includes('administrative_area_level_1')
              );
              const name = neighborhood?.long_name || cityComponent?.long_name || "Your area";
              setLocationName(name);

              sessionStorage.setItem('user_location', JSON.stringify({
                location: userLoc,
                locationName: name,
                timestamp: Date.now()
              }));
            }
          } catch (error) {
            console.error("Error fetching location name:", error);
            setLocationName("Your area");
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationName("Location unavailable");
          const defaultLocation = { lat: 12.9716, lng: 77.5946 };
          setUserLocation(defaultLocation);
        }
      );
    } else {
      setLocationName("Bengaluru");
      setUserLocation({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  // Debounced search function to prevent excessive API calls
  const handleSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return async (query: string) => {
        clearTimeout(timeoutId);
        
        if (!query.trim()) {
          setSearchResults([]);
          setShowSearchResults(false);
          setIsSearching(false);
          return;
        }

        setIsSearching(true);
        
        timeoutId = setTimeout(async () => {
          try {
            const { data, error } = await supabase
              .from('merchants')
              .select('*, services(*)')
              .or(
                `shop_name.ilike.%${query}%,category.ilike.%${query}%,address.ilike.%${query}%`
              )
              .limit(8);

            if (error) throw error;

            if (data) {
              // Simplified search results without heavy rating calculations
              const resultsWithDistance = userLocation
                ? data.map((merchant) => {
                    const distance = calculateDistance(
                      userLocation.lat, userLocation.lng, merchant.lat, merchant.lng
                    );
                    return {
                      ...merchant,
                      distance: `${distance.toFixed(1)} km`,
                      distanceValue: distance,
                      rating: merchant.rating || null
                    };
                  })
                : data.map(merchant => ({ ...merchant, rating: merchant.rating || null }));

              setSearchResults(resultsWithDistance as Merchant[]);
              setShowSearchResults(true);
            }
          } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
          } finally {
            setIsSearching(false);
          }
        }, 300); // 300ms debounce
      };
    })(),
    [userLocation, calculateDistance]
  );

  const handleCategoryClick = useCallback((categoryName: string) => {
    setActiveCategory(activeCategory === categoryName ? null : categoryName);
    setShowSearchResults(false);
  }, [activeCategory]);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  }, [handleSearch]);

  const handleShopClick = useCallback((merchant: Merchant) => {
    navigate(`/merchant/${merchant.id}`);
  }, [navigate]);

  const handleProfileClick = useCallback(() => {
    navigate('/settings/account');
  }, [navigate]);

  return (
    <div className="pb-20 min-h-screen will-change-scroll">
      {/* Header Section - optimized for smooth rendering */}
      <div className="bg-gradient-to-r from-booqit-primary to-purple-700 text-white p-6 rounded-b-3xl shadow-lg transform-gpu">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-light">Hi {userName}! 👋</h1>
            <p className="opacity-90 flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 13.5C13.933 13.5 15.5 11.933 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10C8.5 11.933 10.067 13.5 12 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 21.5C17 17.5 22 14.0718 22 10C22 5.92819 17.5228 2.5 12 2.5C6.47715 2.5 2 5.92819 2 10C2 14.0718 7 17.5 12 21.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {locationName}
            </p>
          </div>
          <Avatar className="h-10 w-10 bg-white cursor-pointer" onClick={handleProfileClick}>
            {userAvatar ? (
              <AvatarImage src={userAvatar} alt={userName} className="object-cover" />
            ) : (
              <AvatarFallback className="text-booqit-primary font-medium">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
        <div className="relative">
          <Search className={`absolute left-3 top-3 h-5 w-5 text-booqit-primary ${isSearching ? 'animate-pulse' : ''}`} />
          <Input
            placeholder="Search services, shops..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            className="pl-10 bg-white text-gray-800 border-0 shadow-md focus:ring-2 focus:ring-white"
          />
        </div>
      </div>

      <div className="p-6 space-y-8 transform-gpu">
        {/* Search Results */}
        {showSearchResults && (
          <div className="will-change-transform">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-normal text-xl">
                {isSearching ? 'Searching...' : 'Search Results'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSearchResults(false);
                  setSearchQuery('');
                }}
                className="text-booqit-primary"
              >
                Clear
              </Button>
            </div>
            {isSearching ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 animate-pulse">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                      <div className="w-12 h-6 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((merchant) => (
                  <div
                    key={merchant.id}
                    onClick={() => handleShopClick(merchant)}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow will-change-transform"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{merchant.shop_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{merchant.category}</p>
                        <p className="text-xs text-gray-500 mt-1">{merchant.address}</p>
                        {merchant.distance && (
                          <p className="text-xs text-booqit-primary mt-1">{merchant.distance}</p>
                        )}
                      </div>
                      {merchant.rating && (
                        <div className="flex items-center bg-green-100 px-2 py-1 rounded-full">
                          <span className="text-xs font-medium text-green-800">
                            ★ {merchant.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Only show other sections if not in search mode */}
        {!showSearchResults && (
          <>
            {/* Upcoming Bookings Section */}
            <UpcomingBookings />

            {/* Categories Section */}
            <div className="will-change-transform">
              <h2 className="mb-4 font-normal text-xl">Categories</h2>
              <div className="grid grid-cols-2 gap-4">
                {featuredCategories.map(category => (
                  <Button
                    key={category.id}
                    variant="outline"
                    className={`h-16 flex items-center justify-between p-0 border transition-all duration-200 overflow-hidden will-change-transform
                      ${activeCategory === category.name 
                        ? 'border-booqit-primary bg-booqit-primary/10 shadow-md' 
                        : 'border-gray-200 shadow-sm hover:shadow-md hover:border-booqit-primary'
                      }`}
                    style={{
                      backgroundColor: activeCategory === category.name 
                        ? `${category.color}20` 
                        : `${category.color}10`
                    }}
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <div className="flex-1 flex items-center justify-start p-2">
                      {category.name === 'Beauty Parlour' ? (
                        <div className="text-xs font-medium text-gray-800 leading-tight">
                          <div>Beauty</div>
                          <div>Parlour</div>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-gray-800">{category.name}</span>
                      )}
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Near You Section */}
            <OptimizedShopsList
              shops={filteredMerchants}
              isLoading={isLoading}
              activeCategory={activeCategory}
              onClearFilter={() => setActiveCategory(null)}
            />

            {/* Lazy Loaded Map Section */}
            <LazyGoogleMap center={userLocation} merchants={filteredMerchants} />
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(HomePage);
