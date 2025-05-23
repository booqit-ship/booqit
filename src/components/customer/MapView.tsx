
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import GoogleMapComponent from '@/components/common/GoogleMap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Merchant } from '@/types';
import { MapPin, Star } from 'lucide-react';
import { toast } from 'sonner';

const MapView: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const navigate = useNavigate();

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
          setMerchants(data as Merchant[]);
        }
      } catch (error) {
        console.error('Error fetching merchants:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMerchants();
  }, []);

  // Calculate markers for the map
  const mapMarkers = merchants.map(merchant => ({
    lat: merchant.lat,
    lng: merchant.lng,
    title: merchant.shop_name
  }));

  const handleMarkerClick = (index: number) => {
    setSelectedMerchant(merchants[index]);
  };

  return (
    <div className="h-[calc(100vh-120px)] relative">
      <GoogleMapComponent 
        center={userLocation || { lat: 12.9716, lng: 77.5946 }}
        zoom={12}
        markers={mapMarkers}
        className="h-full"
        onMarkerClick={handleMarkerClick}
        onClick={() => setSelectedMerchant(null)}
      />
      
      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow">
          <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-center">Loading merchants...</p>
        </div>
      )}
      
      {selectedMerchant && (
        <div className="absolute bottom-6 left-0 right-0 mx-4">
          <Card className="shadow-lg">
            <CardContent className="p-4">
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
