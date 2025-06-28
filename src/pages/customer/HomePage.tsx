
import React, { useState, useEffect, useMemo } from 'react';
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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("Loading location...");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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

  const handleCategoryClick = (categoryName: string) => {
    setActiveCategory(activeCategory === categoryName ? null : categoryName);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="pb-20 min-h-screen">
      {/* Header Section - optimized for smooth rendering */}
      <div className="bg-gradient-to-r from-booqit-primary to-purple-700 text-white p-6 rounded-b-3xl shadow-lg">
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
          <Avatar className="h-10 w-10 bg-white">
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
          <Search className="absolute left-3 top-3 h-5 w-5 text-booqit-primary" />
          <Input
            placeholder="Search services, shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 bg-white text-gray-800 border-0 shadow-md focus:ring-2 focus:ring-white"
          />
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Upcoming Bookings Section */}
        <UpcomingBookings />

        {/* Categories Section */}
        <div>
          <h2 className="mb-4 font-normal text-xl">Categories</h2>
          <div className="grid grid-cols-2 gap-4">
            {featuredCategories.map(category => (
              <Button
                key={category.id}
                variant="outline"
                className={`h-32 flex flex-col items-center justify-center p-4 border transition-all duration-200 relative overflow-hidden
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="relative z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 mt-auto mb-2">
                  <span className="text-sm font-medium text-gray-800">{category.name}</span>
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
      </div>
    </div>
  );
};

export default React.memo(HomePage);
