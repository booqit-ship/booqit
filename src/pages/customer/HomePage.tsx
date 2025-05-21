
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import GoogleMapComponent from '@/components/common/GoogleMap';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Featured categories for filtering
const featuredCategories = [
  { id: 1, name: 'Haircuts', icon: '💇', color: '#7E57C2' },
  { id: 2, name: 'Spas', icon: '💆', color: '#4ECDC4' },
  { id: 3, name: 'Yoga', icon: '🧘', color: '#FF6B6B' },
  { id: 4, name: 'Dental', icon: '🦷', color: '#FFD166' },
  { id: 5, name: 'Fitness', icon: '💪', color: '#3D405B' },
  { id: 6, name: 'Map', icon: '🗺️', color: '#343A40' },
];

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyShops, setNearbyShops] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get user's current location name (this would come from geolocation + reverse geocoding)
  const [locationName, setLocationName] = useState("Loading location...");
  
  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userLoc);
          
          // Fetch location name using reverse geocoding
          fetchLocationName(userLoc.lat, userLoc.lng);
          
          // Fetch nearby shops based on location
          fetchNearbyShops(userLoc);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationName("Location unavailable");
          // Use a default location (Bengaluru)
          const defaultLocation = { lat: 12.9716, lng: 77.5946 };
          setUserLocation(defaultLocation);
          fetchNearbyShops(defaultLocation);
        }
      );
    } else {
      setLocationName("Bengaluru"); // Default fallback
      const defaultLocation = { lat: 12.9716, lng: 77.5946 };
      setUserLocation(defaultLocation);
      fetchNearbyShops(defaultLocation);
    }
  }, []);
  
  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results[0]) {
        // Extract city name from address components
        const addressComponents = data.results[0].address_components;
        const cityComponent = addressComponents.find(
          (component: any) => 
            component.types.includes('locality') || 
            component.types.includes('administrative_area_level_1')
        );
        
        setLocationName(cityComponent ? cityComponent.long_name : "Your area");
      }
    } catch (error) {
      console.error("Error fetching location name:", error);
      setLocationName("Your area");
    }
  };

  const fetchNearbyShops = async (location: { lat: number; lng: number }) => {
    setIsLoading(true);
    try {
      // Fetch merchants from database
      const { data: merchants, error } = await supabase
        .from('merchants')
        .select('*')
        .order('rating', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      if (merchants && merchants.length > 0) {
        // Calculate distance for each merchant (simplified version)
        const shopsWithDistance = merchants.map(merchant => {
          // Simple distance calculation (this is just an approximation)
          const distance = calculateDistance(
            location.lat, location.lng, 
            merchant.lat, merchant.lng
          );
          
          return {
            ...merchant,
            distance: `${distance.toFixed(1)} km`
          };
        });
        
        // Sort by distance
        shopsWithDistance.sort((a, b) => 
          parseFloat(a.distance) - parseFloat(b.distance)
        );
        
        setNearbyShops(shopsWithDistance);
      }
    } catch (error) {
      console.error("Error fetching merchants:", error);
      toast({
        title: "Error",
        description: "Failed to load nearby shops. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Simple distance calculation using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  };
  
  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    if (categoryName === 'Map') {
      navigate('/map');
    } else {
      // Handle other category clicks (e.g. set search filter)
      navigate(`/search?category=${categoryName}`);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getShopImage = (merchant: any) => {
    if (merchant.image_url) {
      return `https://ggclvurfcykbwmhfftkn.supabase.co/storage/v1/object/public/merchant_images/${merchant.image_url}`;
    }
    // Return a default image if no image URL exists
    return 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
  };

  return (
    <div className="pb-20"> {/* Add padding to account for bottom navigation */}
      <motion.div 
        className="bg-gradient-to-r from-booqit-primary to-purple-700 text-white p-6 rounded-b-3xl shadow-lg"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Hi there! 👋</h1>
            <p className="opacity-90 flex items-center">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 13.5C13.933 13.5 15.5 11.933 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10C8.5 11.933 10.067 13.5 12 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 21.5C17 17.5 22 14.0718 22 10C22 5.92819 17.5228 2.5 12 2.5C6.47715 2.5 2 5.92819 2 10C2 14.0718 7 17.5 12 21.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {locationName}
            </p>
          </div>
          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-booqit-primary font-medium">A</span>
          </div>
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
      </motion.div>

      <div className="p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-4">Categories</h2>
            <div className="grid grid-cols-3 gap-4">
              {featuredCategories.map((category) => (
                <Button
                  key={category.id}
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-booqit-primary transition-all"
                  style={{ backgroundColor: `${category.color}10` }}
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <span className="text-2xl mb-2" style={{ color: category.color }}>
                    {category.icon}
                  </span>
                  <span className="text-sm font-medium">{category.name}</span>
                </Button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Near You</h2>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
              </div>
            ) : nearbyShops.length > 0 ? (
              <div className="space-y-4">
                {nearbyShops.map((shop) => (
                  <Card key={shop.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className="w-24 h-24 bg-gray-200 relative">
                          <img 
                            src={getShopImage(shop)} 
                            alt={shop.shop_name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3 flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium text-base">{shop.shop_name}</h3>
                            <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                              ★ {shop.rating || 'New'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{shop.category}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500 flex items-center">
                              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 13.5C13.933 13.5 15.5 11.933 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10C8.5 11.933 10.067 13.5 12 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 21.5C17 17.5 22 14.0718 22 10C22 5.92819 17.5228 2.5 12 2.5C6.47715 2.5 2 5.92819 2 10C2 14.0718 7 17.5 12 21.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {shop.distance}
                            </span>
                            <Button 
                              size="sm" 
                              className="bg-booqit-primary hover:bg-booqit-primary/90 text-xs h-8"
                              onClick={() => navigate(`/merchant/${shop.id}`)}
                            >
                              Book Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No shops found nearby</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => navigate('/map')}
                >
                  Browse on Map
                </Button>
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="mt-8">
            <h2 className="text-xl font-semibold mb-4 flex justify-between items-center">
              <span>Explore Map</span>
              <Button size="sm" variant="link" onClick={() => navigate('/map')}>
                View Full Map
              </Button>
            </h2>
            <Card className="overflow-hidden shadow-md bg-gray-100 h-48 relative">
              <GoogleMapComponent
                center={userLocation || { lat: 12.9716, lng: 77.5946 }}
                zoom={12}
                className="h-full"
                markers={nearbyShops.map(shop => ({ lat: shop.lat, lng: shop.lng, title: shop.shop_name }))}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <Button 
                  className="bg-booqit-primary" 
                  onClick={() => navigate('/map')}
                >
                  Open Map View
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
