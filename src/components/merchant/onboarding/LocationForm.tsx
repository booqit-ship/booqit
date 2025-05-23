
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';
import GoogleMapComponent from '@/components/common/GoogleMap';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LocationFormProps {
  locationDetails: {
    lat: number;
    lng: number;
    address: string;
  };
  setLocationDetails: React.Dispatch<React.SetStateAction<{
    lat: number;
    lng: number;
    address: string;
  }>>;
}

const LocationForm: React.FC<LocationFormProps> = ({ 
  locationDetails, 
  setLocationDetails 
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [mapError, setMapError] = useState<string | null>(null);

  // Function to request and get current location
  const getCurrentLocation = () => {
    setIsLocating(true);
    setMapError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success callback
          const { latitude, longitude } = position.coords;
          
          // Get address via reverse geocoding
          fetchAddress(latitude, longitude);
          
          setLocationDetails({
            lat: latitude,
            lng: longitude,
            address: locationDetails.address
          });
          
          setLocationPermission('granted');
          setIsLocating(false);
        },
        (error) => {
          // Error callback
          console.error("Error getting location:", error);
          setLocationPermission('denied');
          setIsLocating(false);
          setMapError("Unable to get your current location. Please allow location access or pin your shop manually.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      console.error("Geolocation is not supported by this browser");
      setIsLocating(false);
      setMapError("Geolocation is not supported by your browser. Please pin your shop location manually.");
    }
  };

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results[0]) {
        const address = data.results[0].formatted_address;
        setLocationDetails(prev => ({
          ...prev,
          address
        }));
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      setMapError("Error fetching address details. Please try again or enter manually.");
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      setLocationDetails(prev => ({
        ...prev,
        lat,
        lng
      }));
      
      fetchAddress(lat, lng);
    }
  };
  
  // Handle map click to place marker
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      setLocationDetails(prev => ({
        ...prev,
        lat,
        lng
      }));
      
      fetchAddress(lat, lng);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gray-100 border-none">
        <div className="h-72 bg-gray-300 rounded mb-4 overflow-hidden relative">
          <GoogleMapComponent 
            center={{ lat: locationDetails.lat || 12.9716, lng: locationDetails.lng || 77.5946 }}
            markers={locationDetails.lat !== 0 ? [{ lat: locationDetails.lat, lng: locationDetails.lng }] : []}
            draggableMarker={true}
            onMarkerDragEnd={handleMarkerDragEnd}
            onClick={handleMapClick}
            zoom={15}
          />
          
          {/* Instruction overlay */}
          {locationDetails.lat === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white p-4 text-center">
              <div>
                <MapPin className="h-10 w-10 mx-auto mb-2" />
                <p className="font-medium">Click on the map to pin your shop location</p>
                <p className="text-sm opacity-80">Or use the "Use My Current Location" button below</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={getCurrentLocation}
            disabled={isLocating}
            className="w-full bg-booqit-primary hover:bg-booqit-primary/90 flex items-center justify-center gap-2"
          >
            {isLocating ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                <span>Getting Location...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Use My Current Location</span>
              </>
            )}
          </Button>
          
          {locationPermission === 'denied' && (
            <p className="text-red-500 text-xs text-center">
              Location permission denied. Please enable location access in your browser settings.
            </p>
          )}
          
          {mapError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{mapError}</AlertDescription>
            </Alert>
          )}
          
          {locationDetails.address && (
            <div className="mt-4 p-3 bg-white rounded border border-gray-200">
              <p className="text-sm font-medium">Detected Address:</p>
              <p className="text-sm text-gray-600">{locationDetails.address}</p>
            </div>
          )}
        </div>
      </Card>
      
      <div className="text-sm text-gray-500 text-center">
        <p>Drag the map pin to set your exact shop location</p>
        <p className="text-xs mt-1">This will help customers find you easily</p>
      </div>
    </div>
  );
};

export default LocationForm;
