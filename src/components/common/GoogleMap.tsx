
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader, InfoWindow } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Locate } from 'lucide-react';

const googleMapsApiKey = 'AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
};

interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{ lat: number; lng: number; title?: string }>;
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onMarkerClick?: (index: number) => void;
  className?: string;
  draggableMarker?: boolean;
  onMarkerDragEnd?: (e: google.maps.MapMouseEvent) => void;
  showUserLocation?: boolean;
  disableScrolling?: boolean;
}

const GoogleMapComponent: React.FC<MapProps> = ({
  center = { lat: 12.9716, lng: 77.5946 }, // Default to Bangalore
  zoom = 14,
  markers = [],
  onClick,
  onMarkerClick,
  className = '',
  draggableMarker = false,
  onMarkerDragEnd,
  showUserLocation = false,
  disableScrolling = false,
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  
  // Define marker icons after Google Maps is loaded
  const createMarkerIcons = () => {
    // Only create these if Google Maps API is loaded
    if (!window.google || !google.maps) return null;
    
    // Custom marker icon for shops - blue circle with "A" marker style from Google Maps
    const shopMarkerIcon = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#4285F4', // Google blue
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 10,
    };

    // Custom marker icon for user location - soft light blue circle
    const userLocationIcon = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#4285F4', // Light blue
      fillOpacity: 0.6,
      strokeColor: '#4285F4',
      strokeWeight: 2,
      scale: 10,
    };
    
    return { shopMarkerIcon, userLocationIcon };
  };
  
  // Get user's location for the blue dot if showUserLocation is true
  useEffect(() => {
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newUserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newUserLocation);
        },
        (error) => {
          console.error('Error getting user location for map display:', error);
        }
      );
    }
  }, [showUserLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    mapRef.current = map;
    
    // Disable scrolling/dragging if disableScrolling is true
    if (disableScrolling && map) {
      map.setOptions({ 
        gestureHandling: 'none',
        keyboardShortcuts: false
      });
    }
  }, [disableScrolling]);

  const onUnmount = useCallback(() => {
    setMap(null);
    mapRef.current = null;
  }, []);

  // Function to center map on user's location with animation
  const centerOnUserLocation = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(16); // Slightly higher zoom when focusing on user
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newUserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newUserLocation);
          if (mapRef.current) {
            mapRef.current.panTo(newUserLocation);
            mapRef.current.setZoom(16);
          }
        },
        (error) => {
          console.error('Error centering on user location:', error);
        }
      );
    }
  }, [userLocation]);

  // Return loading state if Google Maps hasn't loaded yet
  if (!isLoaded) {
    return <div className={`flex items-center justify-center bg-gray-200 ${className}`}>Loading map...</div>;
  }

  // Create marker icons now that Google Maps is loaded
  const markerIcons = createMarkerIcons();
  if (!markerIcons) {
    return <div className={`flex items-center justify-center bg-gray-200 ${className}`}>Error loading Google Maps</div>;
  }
  
  const { shopMarkerIcon, userLocationIcon } = markerIcons;

  return (
    <div className={`rounded-lg overflow-hidden relative ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onClick}
        options={{
          fullscreenControl: false,
          streetViewControl: false, 
          mapTypeControl: false, 
          zoomControl: false,
          gestureHandling: disableScrolling ? 'none' : 'greedy',
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        }}
      >
        {/* User location marker (soft light blue circle) */}
        {showUserLocation && userLocation && (
          <Marker
            position={userLocation}
            icon={userLocationIcon}
            title="Your Location"
            zIndex={1000} // Make sure user location is on top of other markers
          />
        )}

        {/* Shop markers (blue) */}
        {markers.length > 0 ? (
          markers.map((marker, index) => (
            <Marker
              key={index}
              position={{ lat: marker.lat, lng: marker.lng }}
              title={marker.title}
              draggable={draggableMarker}
              onDragEnd={onMarkerDragEnd}
              onClick={() => onMarkerClick && onMarkerClick(index)}
              icon={shopMarkerIcon}
              animation={google.maps.Animation.DROP}
              label={{
                text: String.fromCharCode(65 + index), // A, B, C, etc.
                color: "#FFFFFF", // White text
                fontWeight: "bold"
              }}
            />
          ))
        ) : draggableMarker ? (
          <Marker
            position={center}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
            animation={google.maps.Animation.DROP}
          />
        ) : null}
      </GoogleMap>
      
      {/* Floating locate button */}
      <Button
        onClick={centerOnUserLocation}
        className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg bg-white hover:bg-gray-100 text-booqit-primary p-0"
        aria-label="Center on my location"
      >
        <Locate className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default GoogleMapComponent;
