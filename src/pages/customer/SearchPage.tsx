import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';
import { Search, MapPin, Star, List, Map } from 'lucide-react';
import GoogleMapComponent from '@/components/common/GoogleMap';
import SearchBottomSheet from '@/components/customer/SearchBottomSheet';
import { useIsMobile } from '@/hooks/use-mobile';

const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [filters, setFilters] = useState({
    sortBy: 'distance',
    priceRange: 'all',
    category: 'all',
    rating: 'all'
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Get user location and fetch merchants
  useEffect(() => {
    const initializeSearch = async () => {
      // Get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.error('Error getting location:', error);
            // Default to Bangalore if location access is denied
            setUserLocation({ lat: 12.9716, lng: 77.5946 });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
        );
      } else {
        setUserLocation({ lat: 12.9716, lng: 77.5946 });
      }

      await fetchMerchants();
    };
    
    initializeSearch();
  }, []);

  // Fetch merchants from database
  const fetchMerchants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('rating', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        setMerchants(data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch merchants. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate distance and apply filters
  useEffect(() => {
    if (merchants.length > 0) {
      let filtered = [...merchants];
      
      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(merchant => 
          merchant.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          merchant.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          merchant.address.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply category filter
      if (filters.category !== 'all') {
        filtered = filtered.filter(merchant => 
          merchant.category.toLowerCase() === filters.category.toLowerCase()
        );
      }
      
      // Apply rating filter
      if (filters.rating !== 'all') {
        const minRating = parseFloat(filters.rating);
        filtered = filtered.filter(merchant => 
          merchant.rating && merchant.rating >= minRating
        );
      }
      
      // Calculate distances if user location is available
      if (userLocation) {
        filtered = filtered.map(merchant => {
          const distance = calculateDistance(
            userLocation.lat, 
            userLocation.lng, 
            merchant.lat, 
            merchant.lng
          );
          return {
            ...merchant,
            distance: `${distance.toFixed(1)} km`,
            distanceValue: distance
          } as Merchant;
        });
        
        // Apply sorting
        if (filters.sortBy === 'distance') {
          filtered.sort((a, b) => (a.distanceValue || 0) - (b.distanceValue || 0));
        } else if (filters.sortBy === 'rating') {
          filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (filters.sortBy === 'name') {
          filtered.sort((a, b) => a.shop_name.localeCompare(b.shop_name));
        }
      }
      
      setFilteredMerchants(filtered);
    }
  }, [merchants, searchTerm, filters, userLocation]);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const mapMarkers = filteredMerchants.map(merchant => ({
    lat: merchant.lat,
    lng: merchant.lng,
    title: merchant.shop_name
  }));

  const handleMarkerClick = (index: number) => {
    setSelectedMerchant(filteredMerchants[index]);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative">
      {/* Floating Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-50">
        <div className="bg-white rounded-full shadow-lg px-4 py-3">
          <form onSubmit={handleSearch} className="mb-3">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="All treatments"
                  className="pl-10 rounded-full border-0 bg-gray-50 text-sm"
                />
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-full h-8 w-8 bg-gray-50"
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? <List className="w-4 h-4" /> : <Map className="w-4 h-4" />}
              </Button>
            </div>
          </form>
          
          <div className="text-xs text-gray-500 mb-2 px-3">Current location</div>
          
          {/* Quick category buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1 px-1">
            {['All', 'Salon', 'Spa', 'Repair', 'Health', 'Fitness'].map(category => (
              <Button 
                key={category}
                variant={filters.category === category.toLowerCase() || (category === 'All' && filters.category === 'all') ? "default" : "outline"}
                onClick={() => setFilters(prev => ({ ...prev, category: category === 'All' ? 'all' : category.toLowerCase() }))}
                className="rounded-full whitespace-nowrap text-xs px-3 py-1 h-7 flex-shrink-0"
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative">
        <GoogleMapComponent 
          center={userLocation || { lat: 12.9716, lng: 77.5946 }}
          zoom={13}
          markers={mapMarkers}
          className="h-full w-full"
          onMarkerClick={handleMarkerClick}
          onClick={() => setSelectedMerchant(null)}
          showUserLocation={true}
        />
        
        {/* Selected merchant card overlay */}
        {selectedMerchant && (
          <div className="absolute bottom-40 left-4 right-4 z-30">
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{selectedMerchant.shop_name}</h3>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="text-sm">{selectedMerchant.rating || 'New'}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 flex items-center mb-2">
                  <MapPin className="w-3 h-3 mr-1" /> 
                  {selectedMerchant.address}
                </p>
                {selectedMerchant.distanceValue && (
                  <p className="text-xs text-gray-500 mb-3">
                    {selectedMerchant.distance} away
                  </p>
                )}
                <Button 
                  className="w-full bg-booqit-primary"
                  size="sm"
                  onClick={() => navigate(`/merchant/${selectedMerchant.id}`)}
                >
                  View Services
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Sheet with filters and nearby venues */}
      <SearchBottomSheet 
        merchants={filteredMerchants}
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={isLoading}
        onMerchantSelect={(merchant) => navigate(`/merchant/${merchant.id}`)}
      />
    </div>
  );
};

export default SearchPage;
