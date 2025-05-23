
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Locate } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const googleMapsApiKey = 'AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc';

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
    googleMapsApiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const isMobile = useIsMobile();
  
  // Define map options
  const mapOptions = {
    fullscreenControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    zoomControl: !isMobile,
    gestureHandling: 'greedy',
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    scrollwheel: true,
    clickableIcons: false,
    disableDefaultUI: isMobile,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP,
    },
  };

  // Create marker icons when Google Maps is loaded
  const createMarkerIcons = useCallback(() => {
    if (!window.google || !google.maps) return null;
    
    const shopMarkerIcon = {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
      fillColor: '#7E57C2',
      fillOpacity: 1,
      strokeColor: '#5E35B1',
      strokeWeight: 1,
      scale: 1.5,
      anchor: new google.maps.Point(12, 22),
    };

    const userLocationIcon = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#60A5FA',
      fillOpacity: 0.8,
      strokeColor: '#3B82F6',
      strokeWeight: 2,
      scale: 10,
    };
    
    return { shopMarkerIcon, userLocationIcon };
  }, []);
  
  // Get user's location for the blue dot
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
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
  }, [showUserLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    mapRef.current = map;
    
    // Apply initial bounds fit if there are markers
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(marker => {
        bounds.extend(new google.maps.LatLng(marker.lat, marker.lng));
      });
      
      // If user location is available, include it in the bounds
      if (userLocation) {
        bounds.extend(new google.maps.LatLng(userLocation.lat, userLocation.lng));
      }
      
      // Add a small padding around bounds
      map.fitBounds(bounds, 50);
    }
  }, [markers, userLocation]);

  const onUnmount = useCallback(() => {
    setMap(null);
    mapRef.current = null;
  }, []);

  // Function to center map on user's location with animation
  const centerOnUserLocation = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(16);
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
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [userLocation]);

  // Update map when center prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo(center);
    }
  }, [center]);

  // Return loading state if Google Maps hasn't loaded yet
  if (!isLoaded) {
    return <div className={`flex items-center justify-center bg-gray-200 ${className}`}>Loading map...</div>;
  }

  // Create marker icons after Google Maps is loaded
  const markerIcons = createMarkerIcons();
  if (!markerIcons) {
    return <div className={`flex items-center justify-center bg-gray-200 ${className}`}>Error loading Google Maps</div>;
  }
  
  const { shopMarkerIcon, userLocationIcon } = markerIcons;

  return (
    <div className={`relative w-full h-full ${className}`}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onClick}
        options={mapOptions as google.maps.MapOptions}
      >
        {/* User location marker */}
        {showUserLocation && userLocation && (
          <Marker
            position={userLocation}
            icon={userLocationIcon}
            title="Your Location"
            zIndex={1000}
          />
        )}

        {/* Shop markers */}
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
      
      {/* Floating locate button */}
      <Button
        onClick={centerOnUserLocation}
        className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg bg-white hover:bg-gray-100 text-booqit-primary p-0 z-10"
        aria-label="Center on my location"
      >
        <Locate className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default React.memo(GoogleMapComponent);
