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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import UpcomingBookings from '@/components/customer/UpcomingBookings';

// Preload critical images
const preloadImage = (src: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
};

// Updated featured categories with illustration images - preload critical images
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

// Preload images on module load
featuredCategories.forEach(category => {
  preloadImage(category.image);
});

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyShops, setNearbyShops] = useState<Merchant[]>([]);
  const [filteredShops, setFilteredShops] = useState<Merchant[]>([]);
  const [displayedShops, setDisplayedShops] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [userName, setUserName] = useState('there');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    userId
  } = useAuth();

  // Get user's current location name (this would come from geolocation + reverse geocoding)
  const [locationName, setLocationName] = useState("Loading location...");

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (userId) {
        try {
          const {
            data,
            error
          } = await supabase.from('profiles').select('name, avatar_url').eq('id', userId).single();
          if (error) throw error;
          if (data) {
            setUserName(data.name.split(' ')[0]); // Get first name
            setUserAvatar(data.avatar_url);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };
    fetchUserProfile();
  }, [userId]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const userLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(userLoc);

        // Fetch location name using reverse geocoding
        fetchLocationName(userLoc.lat, userLoc.lng);

        // Fetch nearby shops based on location
        fetchNearbyShops(userLoc);
      }, error => {
        console.error("Error getting location:", error);
        setLocationName("Location unavailable");
        // Use a default location (Bengaluru)
        const defaultLocation = {
          lat: 12.9716,
          lng: 77.5946
        };
        setUserLocation(defaultLocation);
        fetchNearbyShops(defaultLocation);
      });
    } else {
      setLocationName("Bengaluru"); // Default fallback
      const defaultLocation = {
        lat: 12.9716,
        lng: 77.5946
      };
      setUserLocation(defaultLocation);
      fetchNearbyShops(defaultLocation);
    }
  }, []);

  // Filter shops whenever active category changes or nearby shops update
  useEffect(() => {
    if (activeCategory) {
      // Map the UI category names to database category values
      let dbCategory = activeCategory;
      if (activeCategory === "Salon") {
        dbCategory = "barber_shop";
      } else if (activeCategory === "Beauty Parlour") {
        dbCategory = "beauty_parlour";
      }

      // Filter shops by the mapped category
      const filtered = nearbyShops.filter(shop => shop.category.toLowerCase() === dbCategory.toLowerCase());
      setFilteredShops(filtered);
    } else {
      setFilteredShops(nearbyShops);
    }
  }, [activeCategory, nearbyShops]);

  // Limit displayed shops to 6 for homepage
  useEffect(() => {
    setDisplayedShops(filteredShops.slice(0, 6));
  }, [filteredShops]);

  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc`);
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results[0]) {
        // Get more specific location details
        const addressComponents = data.results[0].address_components;

        // Try to find neighborhood or sublocality first for more precise location
        const neighborhood = addressComponents.find((component: any) => component.types.includes('sublocality_level_1') || component.types.includes('neighborhood'));

        // If no neighborhood, try to get locality (city)
        const cityComponent = addressComponents.find((component: any) => component.types.includes('locality') || component.types.includes('administrative_area_level_1'));
        setLocationName(neighborhood?.long_name || cityComponent?.long_name || "Your area");
      }
    } catch (error) {
      console.error("Error fetching location name:", error);
      setLocationName("Your area");
    }
  };

  // Fetch nearby shops based on user's location
  const fetchNearbyShops = async (location: {
    lat: number;
    lng: number;
  }) => {
    setIsLoading(true);
    try {
      // Fetch merchants from database
      const {
        data: merchants,
        error
      } = await supabase.from('merchants').select('*').order('rating', {
        ascending: false
      });
      if (error) throw error;
      if (merchants && merchants.length > 0) {
        console.log("Fetched merchants:", merchants); // Debug log to check merchant data

        // Calculate distance for each merchant (simplified version)
        const shopsWithDistance = merchants.map(merchant => {
          // Simple distance calculation (this is just an approximation)
          const distance = calculateDistance(location.lat, location.lng, merchant.lat, merchant.lng);
          return {
            ...merchant,
            distance: `${distance.toFixed(1)} km`,
            distanceValue: distance // Add numeric distance for filtering
          } as Merchant; // Explicitly cast to Merchant type
        });

        // Filter shops to only show those within 5km radius
        const nearbyFilteredShops = shopsWithDistance.filter(shop => {
          const distance = shop.distanceValue || 0;
          return distance <= 5; // Only include shops within 5km
        });

        // Sort by distance
        nearbyFilteredShops.sort((a, b) => (a.distanceValue || 0) - (b.distanceValue || 0));
        setNearbyShops(nearbyFilteredShops);
        setFilteredShops(nearbyFilteredShops);
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
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };
  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // Animation variants
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      y: 20,
      opacity: 0
    },
    visible: {
      y: 0,
      opacity: 1
    }
  };
  const handleCategoryClick = (categoryName: string) => {
    if (activeCategory === categoryName) {
      // If clicking the active category, clear the filter
      setActiveCategory(null);
    } else {
      setActiveCategory(categoryName);
    }
  };
  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };
  const getShopImage = (merchant: Merchant) => {
    if (merchant.image_url && merchant.image_url.trim() !== '') {
      // Return the direct image URL if it already includes https://
      if (merchant.image_url.startsWith('http')) {
        return merchant.image_url;
      }
      // Otherwise, construct the full Supabase storage URL
      return `https://ggclvurfcykbwmhfftkn.supabase.co/storage/v1/object/public/merchant_images/${merchant.image_url}`;
    }
    // Return a default image if no image URL exists
    return 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
  };
  const handleBookNow = (merchantId: string) => {
    navigate(`/merchant/${merchantId}`);
  };

  const handleViewMore = () => {
    // Navigate to a dedicated page showing all nearby shops
    const categoryParam = activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : '';
    navigate(`/nearby-shops${categoryParam}`);
  };

  return <div className="pb-20"> {/* Add padding to account for bottom navigation */}
      {/* Header Section */}
      <motion.div className="bg-gradient-to-r from-booqit-primary to-purple-700 text-white p-6 rounded-b-3xl shadow-lg" initial={{
      y: -20,
      opacity: 0
    }} animate={{
      y: 0,
      opacity: 1
    }}>
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
            {userAvatar ? <AvatarImage src={userAvatar} alt={userName} className="object-cover" /> : <AvatarFallback className="text-booqit-primary font-medium">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>}
          </Avatar>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-booqit-primary" />
          <Input placeholder="Search services, shops..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSearch()} className="pl-10 bg-white text-gray-800 border-0 shadow-md focus:ring-2 focus:ring-white" />
        </div>
      </motion.div>

      <div className="p-6">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Upcoming Bookings Section */}
          <motion.div variants={itemVariants} className="mb-8">
            <UpcomingBookings />
          </motion.div>

          {/* Categories Section */}
          <motion.div variants={itemVariants}>
            <h2 className="mb-4 font-normal text-xl">Categories</h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {featuredCategories.map(category => <Button key={category.id} variant="outline" className={`h-auto flex flex-col items-center justify-center p-3 border transition-all
                    ${activeCategory === category.name ? 'border-booqit-primary bg-booqit-primary/10 shadow-md' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-booqit-primary'}`} style={{
              backgroundColor: activeCategory === category.name ? `${category.color}20` : `${category.color}10`
            }} onClick={() => handleCategoryClick(category.name)}>
                  <div className="w-16 h-16 mb-1 flex items-center justify-center">
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="w-full h-full object-contain"
                      loading="eager"
                      decoding="sync"
                      onError={(e) => {
                        console.error(`Failed to load image for ${category.name}`);
                        // Fallback to a simple colored div if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">{category.name}</span>
                </Button>)}
            </div>
          </motion.div>

          {/* Near You Section */}
          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="mb-4 font-normal text-xl">
              {activeCategory ? `${activeCategory} Near You` : "Near You"}
              {activeCategory && <Button variant="link" className="ml-2 p-0 h-auto text-sm text-booqit-primary" onClick={() => setActiveCategory(null)}>
                  (Clear filter)
                </Button>}
            </h2>
            {isLoading ? <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
              </div> : displayedShops.length > 0 ? <div className="space-y-4">
                {displayedShops.map(shop => <Card key={shop.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className="w-24 h-24 bg-gray-200 flex-shrink-0">
                          <img src={getShopImage(shop)} alt={shop.shop_name} className="w-full h-full object-cover" onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
                      console.error(`Failed to load image for ${shop.shop_name}, URL: ${shop.image_url}`);
                    }} />
                        </div>
                        <div className="p-3 flex-1 py-[6px]">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-base line-clamp-1">{shop.shop_name}</h3>
                            <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center whitespace-nowrap">
                              ★ {shop.rating?.toFixed(1) || 'New'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-1">{shop.category}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500 flex items-center">
                              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 13.5C13.933 13.5 15.5 11.933 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10C8.5 11.933 10.067 13.5 12 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M12 21.5C17 17.5 22 14.0718 22 10C22 5.92819 17.5228 2.5 12 2.5C6.47715 2.5 2 5.92819 2 10C2 14.0718 7 17.5 12 21.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              {shop.distance}
                            </span>
                            <Button size="sm" className="bg-booqit-primary hover:bg-booqit-primary/90 text-xs h-8" onClick={() => handleBookNow(shop.id)}>
                              Book Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
                
                {filteredShops.length > 6 && (
                  <div className="flex justify-center mt-4">
                    <Button 
                      variant="outline" 
                      onClick={handleViewMore}
                      className="border-booqit-primary text-booqit-primary hover:bg-booqit-primary hover:text-white"
                    >
                      View More ({filteredShops.length - 6} more shops)
                    </Button>
                  </div>
                )}
              </div> : <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  {activeCategory ? `No ${activeCategory} shops found within 5km` : "No shops found within 5km"}
                </p>
                <Button variant="link" className="mt-2" onClick={() => navigate('/map')}>
                  Browse on Map
                </Button>
              </div>}
          </motion.div>

          {/* Explore Map Section */}
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-4 flex justify-between items-center">
              <span className="font-normal">Explore Map</span>
              <Button size="sm" variant="link" onClick={() => navigate('/map')}>
                View Full Map
              </Button>
            </h2>
            <Card className="overflow-hidden shadow-md bg-gray-100 h-48 relative">
              <GoogleMapComponent center={userLocation || {
              lat: 12.9716,
              lng: 77.5946
            }} zoom={12} className="h-full" markers={filteredShops.map(shop => ({
              lat: shop.lat,
              lng: shop.lng,
              title: shop.shop_name
            }))} />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <Button className="bg-booqit-primary" onClick={() => navigate('/map')}>
                  Open Map View
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>;
};
export default HomePage;
