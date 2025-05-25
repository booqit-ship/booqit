
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';
import { Search } from 'lucide-react';
import GoogleMapComponent from '@/components/common/GoogleMap';
import SearchBottomSheet from '@/components/customer/SearchBottomSheet';

const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [filters, setFilters] = useState({
    sortBy: 'distance',
    priceRange: 'all',
    category: 'all',
    rating: 'all',
    genderFocus: 'all'
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get user location and fetch merchants
  useEffect(() => {
    const initializeSearch = async () => {
      // Get user's current location with high accuracy
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(newLocation);
          },
          (error) => {
            console.error('Error getting location:', error);
            // Default to Bangalore if location access is denied
            setUserLocation({ lat: 12.9716, lng: 77.5946 });
            toast({
              title: "Location Access",
              description: "Please enable location access for better results",
              variant: "default",
            });
          },
          { 
            enableHighAccuracy: true, 
            timeout: 15000, 
            maximumAge: 10000 
          }
        );
      } else {
        setUserLocation({ lat: 12.9716, lng: 77.5946 });
      }

      await fetchMerchants();
    };
    
    initializeSearch();
  }, []);

  // Fetch merchants from database with services
  const fetchMerchants = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('merchants')
        .select(`
          *,
          services (
            id,
            merchant_id,
            name,
            price,
            duration,
            description,
            image_url,
            created_at
          )
        `);

      // Apply database-level filtering for gender focus if not 'all'
      if (filters.genderFocus !== 'all') {
        query = query.or(`gender_focus.eq.${filters.genderFocus},gender_focus.eq.unisex`);
      }

      // Apply rating filter at database level
      if (filters.rating !== 'all') {
        const minRating = parseFloat(filters.rating);
        query = query.gte('rating', minRating);
      }

      // Apply sorting at database level
      if (filters.sortBy === 'rating') {
        query = query.order('rating', { ascending: false });
      } else if (filters.sortBy === 'name') {
        query = query.order('shop_name', { ascending: true });
      } else {
        query = query.order('rating', { ascending: false }); // Default fallback
      }

      const { data, error } = await query;
        
      if (error) throw error;
      
      if (data) {
        console.log('Fetched merchants with filters:', data);
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

  // Re-fetch merchants when filters change
  useEffect(() => {
    fetchMerchants();
  }, [filters.genderFocus, filters.rating, filters.sortBy]);

  // Calculate distance and apply client-side filters
  useEffect(() => {
    if (merchants.length > 0) {
      let filtered = [...merchants];
      
      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(merchant => 
          merchant.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          merchant.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          merchant.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (merchant.services && merchant.services.some(service => 
            service.name.toLowerCase().includes(searchTerm.toLowerCase())
          ))
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
        
        // Apply distance sorting (only if sortBy is distance)
        if (filters.sortBy === 'distance') {
          filtered.sort((a, b) => (a.distanceValue || 0) - (b.distanceValue || 0));
        }
      }
      
      setFilteredMerchants(filtered);
    }
  }, [merchants, searchTerm, userLocation, filters.sortBy]);

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
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black w-5 h-5 z-10" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="All treatments • Current location"
              className="pl-12 pr-4 py-4 rounded-2xl border-0 shadow-lg bg-white/95 backdrop-blur-sm text-base placeholder:text-gray-600 focus:ring-2 focus:ring-booqit-primary font-medium"
            />
          </div>
        </form>
      </div>

      {/* Map View - Full Height */}
      <div className="flex-1 w-full">
        <GoogleMapComponent 
          center={userLocation || { lat: 12.9716, lng: 77.5946 }}
          zoom={userLocation ? 14 : 11}
          markers={mapMarkers}
          className="h-full w-full"
          onMarkerClick={handleMarkerClick}
          onClick={() => setSelectedMerchant(null)}
          showUserLocation={true}
        />
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
