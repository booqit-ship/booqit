
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
  image: '/lovable-uploads/af83ca05-7d12-4bb4-9e5e-9d7e0421b721.png',
  color: '#7E57C2'
}, {
  id: 2,
  name: 'Beauty Parlour',
  image: '/lovable-uploads/e8017a81-26c0-495a-af95-e68ca23ba46c.png',
  color: '#FF6B6B'
}];

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("Loading location...");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const navigate = useNavigate();
  const { userId } = useAuth();

  // Use optimized hooks
  const { userName, userAvatar } = useOptimizedUserProfile();
  const { merchants, isLoading } = useOptimizedMerchants(userLocation);

  // Filter merchants by category
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
        const cached = localStorage.getItem('user_location');
        if (cached) {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 10 * 60 * 1000) { // 10 minutes
            setUserLocation(data.location);
            setLocationName(data.locationName || "Your area");
            setLocationLoading(false);
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

              localStorage.setItem('user_location', JSON.stringify({
                location: userLoc,
                locationName: name,
                timestamp: Date.now()
              }));
            }
          } catch (error) {
            console.error("Error fetching location name:", error);
            setLocationName("Your area");
          }
          setLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationName("Location unavailable");
          const defaultLocation = { lat: 12.9716, lng: 77.5946 };
          setUserLocation(defaultLocation);
          setLocationLoading(false);
        }
      );
    } else {
      setLocationName("Bengaluru");
      setUserLocation({ lat: 12.9716, lng: 77.5946 });
      setLocationLoading(false);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
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

      <div className="p-6 pb-24">
        {/* Upcoming Bookings Section */}
        <div className="mb-8">
          <UpcomingBookings />
        </div>

        {/* Categories Section */}
        <div className="mb-8">
          <h2 className="mb-4 font-normal text-xl">Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {featuredCategories.map(category => (
              <Button
                key={category.id}
                variant="outline"
                className={`h-auto flex flex-col items-center justify-center p-3 border transition-all
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
                <div className="w-16 h-16 mb-1 flex items-center justify-center">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-sm font-medium">{category.name}</span>
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
