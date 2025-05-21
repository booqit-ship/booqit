
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
          
          // Mock reverse geocoding (would use actual service in production)
          const mockAddress = "123 Main Street, Bangalore, Karnataka, India";
          
          setLocationDetails({
            lat: latitude,
            lng: longitude,
            address: mockAddress
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

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gray-100 border-none">
        <div className="h-40 bg-gray-300 flex items-center justify-center mb-4 rounded">
          {locationDetails.lat !== 0 && locationDetails.lng !== 0 ? (
            <div className="text-center">
              <div className="text-green-600 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-sm">Location set successfully</p>
              <p className="text-xs text-gray-500">{locationDetails.lat.toFixed(6)}, {locationDetails.lng.toFixed(6)}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Map will appear here</p>
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
        <p>(Map interaction will be available in the next version)</p>
      </div>
    </div>
  );
};

export default LocationForm;
