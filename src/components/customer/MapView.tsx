
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleMapComponent from '@/components/common/GoogleMap';
import { Merchant } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapViewProps {
  isFullMap?: boolean;
}

const MapView: React.FC<MapViewProps> = ({ isFullMap = false }) => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="h-full w-full relative">
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
      
      {selectedMerchant && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-11/12 max-w-sm bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center mr-3">
              {selectedMerchant.image_url ? (
                <img 
                  src={selectedMerchant.image_url} 
                  alt={selectedMerchant.shop_name}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                <Store className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{selectedMerchant.shop_name}</h3>
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="h-3 w-3 mr-1" />
                <span>{selectedMerchant.distance}</span>
              </div>
            </div>
          </div>
          <Button 
            className="w-full mt-3"
            onClick={() => handleMerchantClick(selectedMerchant)}
          >
            View Details
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapView;
