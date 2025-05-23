
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import GoogleMapComponent from '@/components/common/GoogleMap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Merchant } from '@/types';
import { MapPin, Star, X } from 'lucide-react';
import { toast } from 'sonner';

const MapView: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const navigate = useNavigate();

  // Get category from URL params if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    if (category) {
      setActiveCategory(category);
    }
  }, []);

  useEffect(() => {
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
          toast.error('Could not access your location. Using default location.');
          // Default to Bangalore if location access is denied
          setUserLocation({ lat: 12.9716, lng: 77.5946 });
        }
      );
    }

    // Fetch merchants
    const fetchMerchants = async () => {
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
          const merchantsWithDistance = data.map((merchant: Merchant) => {
            if (userLocation) {
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
            }
            return merchant;
          });
          
          setMerchants(merchantsWithDistance as Merchant[]);
        }
      } catch (error) {
        console.error('Error fetching merchants:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMerchants();
  }, [userLocation]);

  // Filter merchants based on active category and distance (now up to 5km)
  useEffect(() => {
    if (merchants.length > 0) {
      // First filter by distance (up to 5km)
      let distanceFiltered = merchants.filter(merchant => {
        // Use the numeric distance value for filtering
        return merchant.distanceValue !== undefined && merchant.distanceValue <= 5;
      });
      
      // Then filter by category if one is active
      if (activeCategory) {
        // Map UI category names to database values
        let dbCategory = activeCategory;
        if (activeCategory === "Salon") {
          dbCategory = "barber_shop";
        } else if (activeCategory === "Beauty Parlour") {
          dbCategory = "beauty_parlour";
        }
        
        distanceFiltered = distanceFiltered.filter(merchant => 
          merchant.category.toLowerCase() === dbCategory.toLowerCase()
        );
      }
      
      setFilteredMerchants(distanceFiltered);
    } else {
      setFilteredMerchants([]);
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
    <div className="h-full relative">
      <GoogleMapComponent 
        center={userLocation || { lat: 12.9716, lng: 77.5946 }}
        zoom={14}
        markers={mapMarkers}
        className="h-full"
        onMarkerClick={handleMarkerClick}
        onClick={() => setSelectedMerchant(null)}
        showUserLocation={true}
        disableScrolling={true} // Disable scrolling/dragging on the map
      />
      
      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow">
          <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-center">Loading merchants...</p>
        </div>
      )}
      
      {filteredMerchants.length === 0 && !loading && (
        <div className="absolute bottom-24 left-0 right-0 mx-4">
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <p>No services found within 5km</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {!loading && filteredMerchants.length > 0 && (
        <div className="absolute bottom-24 left-0 right-0 mx-4">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <p className="font-medium text-sm mb-2">
                Nearby services
              </p>
              <p className="text-gray-600 text-xs">
                {filteredMerchants.length} {filteredMerchants.length === 1 ? 'service' : 'services'} within 5km
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {selectedMerchant && (
        <div className="absolute bottom-6 left-0 right-0 mx-4">
          <Card className="shadow-lg">
            <CardContent className="p-4 pr-10 relative">
              <button 
                className="absolute top-2 right-2 rounded-full p-1 bg-gray-100 hover:bg-gray-200"
                onClick={handleCloseCard}
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
                <MapPin className="w-3 h-3 mr-1" /> {selectedMerchant.address}
              </p>
              <p className="text-sm mt-1">{selectedMerchant.category}</p>
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
