
import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader, InfoWindow } from '@react-google-maps/api';

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
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Define marker icons after Google Maps is loaded
  const createMarkerIcons = () => {
    // Only create these if Google Maps API is loaded
    if (!window.google || !google.maps) return null;
    
    // Custom marker icon for shops
    const shopMarkerIcon = {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      fillColor: '#7E57C2',
      fillOpacity: 1,
      strokeColor: '#5E35B1',
      strokeWeight: 1,
      scale: 1.5,
      anchor: new google.maps.Point(12, 22),
    };

    // Custom marker icon for user location
    const userLocationIcon = {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: '#3B82F6',
      fillOpacity: 1,
      strokeColor: '#1D4ED8',
      strokeWeight: 1,
      scale: 1.5,
      anchor: new google.maps.Point(12, 22),
    };
    
    return { shopMarkerIcon, userLocationIcon };
  };
  
  // Get user's location for the blue dot if showUserLocation is true
  useEffect(() => {
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting user location for map display:', error);
        }
      );
    }
  }, [showUserLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

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
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onClick}
        options={{
          fullscreenControl: false,
          streetViewControl: true,
          mapTypeControl: true,
          zoomControl: true,
          gestureHandling: 'greedy', // Makes the map more mobile-friendly
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT,
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          },
        }}
      >
        {/* User location marker (blue) */}
        {showUserLocation && userLocation && (
          <Marker
            position={userLocation}
            icon={userLocationIcon}
            title="Your Location"
            zIndex={1000} // Make sure user location is on top of other markers
            animation={google.maps.Animation.DROP}
          />
        )}

        {/* Shop markers (purple) */}
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
    </div>
  );
};

export default GoogleMapComponent;
