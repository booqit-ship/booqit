import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleMapComponent from '@/components/common/GoogleMap';
import { Merchant } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronRight, Star, MapPin, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const MapView: React.FC = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMapFullScreen, setShowMapFullScreen] = useState(false);

  // Get user's location and nearby merchants
  useEffect(() => {
    const getUserLocationAndMerchants = async () => {
      try {
        setLoading(true);
        // Get user's location
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            setUserLocation({ lat: userLat, lng: userLng });
            
            // Fetch merchants from Supabase
            const { data, error } = await supabase
              .from('merchants')
              .select('*');
            
            if (error) throw error;
            
            // Calculate distance and filter merchants within 5km
            const merchantsWithDistance = data
              .map((merchant) => {
                const distance = calculateDistance(
                  userLat, userLng,
                  merchant.lat, merchant.lng
                );
                return {
                  ...merchant,
                  distance: formatDistance(distance),
                  distanceValue: distance
                };
              })
              .filter(merchant => merchant.distanceValue <= 5) // Filter merchants within 5km
              .sort((a, b) => a.distanceValue - b.distanceValue); // Sort by distance
            
            setMerchants(merchantsWithDistance);
          },
          (error) => {
            console.error('Error getting location:', error);
            toast.error('Could not access your location. Please enable location services.');
            // Fallback to get all merchants
            fetchAllMerchants();
          }
        );
      } catch (error) {
        console.error('Error fetching merchants:', error);
        toast.error('Failed to load nearby services');
      } finally {
        setLoading(false);
      }
    };
    
    const fetchAllMerchants = async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('*');
      
      if (error) {
        console.error('Error fetching all merchants:', error);
        toast.error('Failed to load services');
        return;
      }
      
      setMerchants(data || []);
    };
    
    getUserLocationAndMerchants();
  }, []);
  
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    // Haversine formula to calculate distance between two points on Earth
    const R = 6371; // Radius of Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLng = deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };
  
  const formatDistance = (distance: number) => {
    if (distance < 1) {
      // Convert to meters if less than 1 km
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  const handleMarkerClick = (index: number) => {
    setSelectedMerchant(merchants[index]);
  };

  const handleMerchantClick = (merchant: Merchant) => {
    navigate(`/merchant/${merchant.id}`);
  };

  if (showMapFullScreen) {
    return (
      <div className="absolute inset-0 z-10 bg-white">
        <GoogleMapComponent 
          center={userLocation || { lat: 12.9716, lng: 77.5946 }}
          markers={merchants.map((merchant) => ({
            lat: merchant.lat,
            lng: merchant.lng,
            title: merchant.shop_name
          }))}
          zoom={14}
          onMarkerClick={handleMarkerClick}
          showUserLocation={true}
          className="h-full w-full"
        />
        <Button
          variant="secondary"
          className="absolute bottom-5 left-1/2 transform -translate-x-1/2 shadow-lg z-10"
          onClick={() => setShowMapFullScreen(false)}
        >
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-48 relative">
        <GoogleMapComponent 
          center={userLocation || { lat: 12.9716, lng: 77.5946 }}
          markers={merchants.map((merchant) => ({
            lat: merchant.lat,
            lng: merchant.lng,
            title: merchant.shop_name
          }))}
          zoom={14}
          onMarkerClick={handleMarkerClick}
          showUserLocation={true}
        />
        <Button
          variant="secondary"
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 shadow-lg bg-white"
          onClick={() => setShowMapFullScreen(true)}
        >
          Explore Map
        </Button>
      </div>
      
      <div className="flex-grow overflow-auto p-4 bg-gray-50">
        <h2 className="text-lg font-medium mb-3">Nearby Services (within 5km)</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
          </div>
        ) : merchants.length > 0 ? (
          <div className="space-y-3">
            {merchants.map((merchant) => (
              <Card 
                key={merchant.id} 
                className={`overflow-hidden cursor-pointer transition-colors ${
                  selectedMerchant?.id === merchant.id ? 'border-booqit-primary' : 'hover:border-gray-300'
                }`}
                onClick={() => handleMerchantClick(merchant)}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-24 h-24 bg-gray-200 relative">
                      {merchant.image_url ? (
                        <img 
                          src={merchant.image_url} 
                          alt={merchant.shop_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-grow">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{merchant.shop_name}</h3>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        <span>{merchant.rating || '4.5'}</span>
                        <Separator orientation="vertical" className="mx-2 h-3" />
                        <span>{merchant.category}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{merchant.distance}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No services found within 5km</p>
            <p className="text-sm mt-1">Try searching in a different area</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
