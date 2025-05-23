
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import GoogleMapComponent from '@/components/common/GoogleMap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Merchant } from '@/types';
import { MapPin, Star, X } from 'lucide-react';
import { toast } from 'sonner';

const MapView: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const navigate = useNavigate();
  const [showInfoCard, setShowInfoCard] = useState(true);

  // Get user's location and fetch merchants
  useEffect(() => {
    getUserLocation();
    fetchMerchants();
  }, [category]);

  // Function to get user's current location
  const getUserLocation = () => {
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
  };

  // Refresh user location when the my location button is clicked
  const handleMyLocationClick = () => {
    toast.info('Updating your location...');
    getUserLocation();
    
    // If we have user location and a selected merchant, recalculate the distance
    if (userLocation && selectedMerchant) {
      const updatedMerchant = {
        ...selectedMerchant,
        distanceValue: calculateDistanceValue(
          userLocation.lat,
          userLocation.lng,
          selectedMerchant.lat,
          selectedMerchant.lng
        )
      };
      setSelectedMerchant(updatedMerchant);
    }
  };

  // Fetch merchants based on category
  const fetchMerchants = async () => {
    try {
      let query = supabase.from('merchants').select('*');
      
      // Map category parameter to database category values
      if (category) {
        if (category === 'Salon') {
          query = query.eq('category', 'barber_shop');
        } else if (category === 'Beauty Parlour') {
          query = query.eq('category', 'beauty_parlour');
        } else {
          // For other categories, use as is but convert spaces to underscores
          const dbCategory = category.toLowerCase().replace(/\s+/g, '_');
          query = query.eq('category', dbCategory);
        }
      }
      
      // Sort by rating (highest first)
      query = query.order('rating', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setMerchants(data as Merchant[]);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
      toast.error('Failed to load merchants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate markers for the map
  const mapMarkers = merchants.map(merchant => ({
    lat: merchant.lat,
    lng: merchant.lng,
    title: merchant.shop_name
  }));

  const handleMarkerClick = (index: number) => {
    setSelectedMerchant(merchants[index]);
    setShowInfoCard(true);
  };
  
  // Calculate distance value for sorting purposes
  const calculateDistanceValue = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
  
  // Format distance for display
  const formatDistance = (distance: number) => {
    return distance.toFixed(1);
  };
  
  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };

  const handleCloseInfoCard = () => {
    setShowInfoCard(false);
  };

  return (
    <div className="h-[calc(100vh-120px)] relative">
      {/* Top info card */}
      {showInfoCard && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-4 relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseInfoCard}
                className="absolute right-2 top-2 h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
              
              <h2 className="font-semibold mb-2">
                {category ? `${category} Shops` : 'All Nearby Shops'}
              </h2>
              
              {category && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/map')}
                  className="mb-2"
                >
                  Show all categories
                </Button>
              )}
              
              <p className="text-sm text-gray-600">
                {merchants.length} {merchants.length === 1 ? 'shop' : 'shops'} found
                {userLocation && ` around your location`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Google Map */}
      <GoogleMapComponent 
        center={userLocation || { lat: 12.9716, lng: 77.5946 }}
        zoom={14}
        markers={mapMarkers}
        className="h-full"
        showUserLocation={true}
        onMarkerClick={handleMarkerClick}
        onClick={() => setSelectedMerchant(null)}
        onMyLocationClick={handleMyLocationClick}
      />
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow">
          <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-center">Loading merchants...</p>
        </div>
      )}
      
      {/* Selected merchant details */}
      {selectedMerchant && userLocation && (
        <div className="absolute bottom-6 left-0 right-0 mx-4">
          <Card className="shadow-lg bg-white/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">{selectedMerchant.shop_name}</h3>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  <span>{selectedMerchant.rating?.toFixed(1) || 'New'}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-1">{selectedMerchant.category.replace(/_/g, ' ')}</p>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <MapPin className="w-3 h-3 mr-1" /> {selectedMerchant.address}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm font-medium text-booqit-primary">
                  {formatDistance(
                    calculateDistanceValue(
                      userLocation.lat, 
                      userLocation.lng, 
                      selectedMerchant.lat, 
                      selectedMerchant.lng
                    )
                  )} km away
                </span>
                <Button 
                  className="bg-booqit-primary"
                  size="sm"
                  onClick={() => navigate(`/merchant/${selectedMerchant.id}`)}
                >
                  Book Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MapView;
