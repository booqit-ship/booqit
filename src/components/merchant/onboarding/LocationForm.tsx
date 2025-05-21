
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import GoogleMapComponent from '@/components/common/GoogleMap';
import { supabase } from '@/integrations/supabase/client';

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

  // Function to request and get current location
  const getCurrentLocation = () => {
    setIsLocating(true);
    
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
        },
        { enableHighAccuracy: true }
      );
    } else {
      console.error("Geolocation is not supported by this browser");
      setIsLocating(false);
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

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gray-100 border-none">
        <div className="h-64 bg-gray-300 rounded mb-4 overflow-hidden">
          <GoogleMapComponent 
            center={{ lat: locationDetails.lat || 12.9716, lng: locationDetails.lng || 77.5946 }}
            markers={locationDetails.lat !== 0 ? [{ lat: locationDetails.lat, lng: locationDetails.lng }] : []}
            draggableMarker={true}
            onMarkerDragEnd={handleMarkerDragEnd}
          />
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span>Use My Current Location</span>
              </>
            )}
          </Button>
          
          {locationPermission === 'denied' && (
            <p className="text-red-500 text-xs text-center">
              Location permission denied. Please enable location access in your browser settings.
            </p>
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
      </div>
    </div>
  );
};

export default LocationForm;
