
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import GoogleMapComponent from '@/components/common/GoogleMap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Merchant } from '@/types';
import { MapPin, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const MapView: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Get category from URL params if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    if (category) {
      setActiveCategory(category);
    }
  }, []);

  // Get user location and fetch merchants
  const initializeMap = useCallback(async () => {
    // Get user's current location
    try {
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
            toast.error('Could not access your location. Using default location.');
            // Default to Bangalore if location access is denied
            setUserLocation({ lat: 12.9716, lng: 77.5946 });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
        );
      } else {
        setUserLocation({ lat: 12.9716, lng: 77.5946 });
      }

      // Fetch merchants
      await fetchMerchants();
    } catch (error) {
      console.error('Initialization error:', error);
      toast.error('There was a problem loading the map. Please try again.');
    }
  }, []);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  // Fetch merchants from database
  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('rating', { ascending: false });
        
      if (error) {
        console.error('Error fetching merchants:', error);
        toast.error('Failed to load merchants. Please try again.');
        throw error;
      }
      
      if (data) {
        // Type assertion to ensure data matches Merchant[] type
        const merchantData = data as Merchant[];
        setMerchants(merchantData);
        
        // If user location is available, calculate distances
        if (userLocation) {
          const merchantsWithDistance = calculateMerchantsDistance(merchantData, userLocation);
          setMerchants(merchantsWithDistance);
        }
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate merchant distances when user location changes
  useEffect(() => {
    if (userLocation && merchants.length > 0) {
      const merchantsWithDistance = calculateMerchantsDistance(merchants, userLocation);
      setMerchants(merchantsWithDistance);
    }
  }, [userLocation]);

  // Calculate distances for all merchants
  const calculateMerchantsDistance = (merchantList: Merchant[], location: {lat: number, lng: number}) => {
    return merchantList.map((merchant: Merchant) => {
      const distance = calculateDistance(
        location.lat, 
        location.lng, 
        merchant.lat, 
        merchant.lng
      );
      return {
        ...merchant,
        distance: `${distance.toFixed(1)} km`,
        distanceValue: distance
      } as Merchant;
    });
  };

  // Filter merchants based on active category
  useEffect(() => {
    if (activeCategory && merchants.length > 0) {
      // Map UI category names to database values
      let dbCategory = activeCategory;
      if (activeCategory === "Salon") {
        dbCategory = "barber_shop";
      } else if (activeCategory === "Beauty Parlour") {
        dbCategory = "beauty_parlour";
      }
      
      const filtered = merchants.filter(merchant => 
        merchant.category.toLowerCase() === dbCategory.toLowerCase()
      );
      setFilteredMerchants(filtered);
    } else {
      setFilteredMerchants(merchants);
    }
  }, [activeCategory, merchants]);

  // Simple distance calculation using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // Calculate markers for the map
  const mapMarkers = filteredMerchants.map(merchant => ({
    lat: merchant.lat,
    lng: merchant.lng,
    title: merchant.shop_name
  }));

  const handleMarkerClick = (index: number) => {
    setSelectedMerchant(filteredMerchants[index]);
  };

  const handleCloseCard = () => {
    setSelectedMerchant(null);
  };

  return (
    <div className="h-full w-full absolute inset-0">
      <GoogleMapComponent 
        center={userLocation || { lat: 12.9716, lng: 77.5946 }}
        zoom={13}
        markers={mapMarkers}
        className="h-full w-full"
        onMarkerClick={handleMarkerClick}
        onClick={() => setSelectedMerchant(null)}
        showUserLocation={true}
      />
      
      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg z-10">
          <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-center font-medium">Loading merchants...</p>
        </div>
      )}
      
      {selectedMerchant && (
        <div className={`absolute ${isMobile ? 'bottom-24 left-0 right-0 mx-4' : 'bottom-8 left-8 max-w-md'} z-10`}>
          <Card className="shadow-lg">
            <CardContent className="p-4 pr-10 relative">
              <button 
                className="absolute top-2 right-2 rounded-full p-1 bg-gray-100 hover:bg-gray-200"
                onClick={handleCloseCard}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{selectedMerchant.shop_name}</h3>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span>{selectedMerchant.rating || 'New'}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <MapPin className="w-3 h-3 mr-1" /> 
                <span className="line-clamp-1">{selectedMerchant.address}</span>
              </p>
              <p className="text-sm mt-1">{selectedMerchant.category}</p>
              {selectedMerchant.distanceValue && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedMerchant.distance} away
                </p>
              )}
              <Button 
                className="w-full mt-3 bg-booqit-primary"
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
  );
};

export default MapView;
