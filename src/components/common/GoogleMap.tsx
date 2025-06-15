
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

// Custom dark aesthetic map theme
const customMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#1a1a2e"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#16213e"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#0f3460"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#ae9142"
      }
    ]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#16213e"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#0f3460"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#16213e"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#e55039"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#f39801"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#533d4a"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#212a3d"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9ca5b3"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#746855"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#1f2835"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#f3d19c"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2f3948"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#515c6d"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#17263c"
      }
    ]
  }
];

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
  
  // Define map options - only define these when API is loaded
  const getMapOptions = useCallback(() => {
    if (!isLoaded || typeof google === 'undefined') return {};
    
    return {
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      zoomControl: !isMobile,
      gestureHandling: 'greedy',
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      scrollwheel: true,
      clickableIcons: false,
      disableDefaultUI: isMobile,
      minZoom: 10, // Minimum zoom level to prevent excessive zoom out
      maxZoom: 20, // Maximum zoom level
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_TOP,
      },
      styles: customMapStyle, // Apply custom dark theme
    };
  }, [isLoaded, isMobile]);

  // Create beautiful custom marker icons when Google Maps is loaded
  const createMarkerIcons = useCallback(() => {
    if (!isLoaded || typeof google === 'undefined') return null;
    
    // Beautiful gradient shop marker with glow effect
    const shopMarkerIcon = {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
        <svg width="48" height="58" viewBox="0 0 48 58" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="grad1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#7E57C2;stop-opacity:1" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M24 0C10.7 0 0 10.7 0 24C0 37.3 24 58 24 58S48 37.3 48 24C48 10.7 37.3 0 24 0Z" fill="url(#grad1)" filter="url(#glow)"/>
          <circle cx="24" cy="24" r="12" fill="white" opacity="0.9"/>
          <path d="M24 14C19.6 14 16 17.6 16 22C16 26.4 19.6 30 24 30C28.4 30 32 26.4 32 22C32 17.6 28.4 14 24 14ZM24 26C21.8 26 20 24.2 20 22C20 19.8 21.8 18 24 18C26.2 18 28 19.8 28 22C28 24.2 26.2 26 24 26Z" fill="#7E57C2"/>
        </svg>
      `),
      scaledSize: new google.maps.Size(48, 58),
      anchor: new google.maps.Point(24, 58),
    };

    // Elegant user location marker with pulse effect
    const userLocationIcon = {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="userGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#4ECDC4;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#60A5FA;stop-opacity:1" />
            </radialGradient>
            <filter id="pulse">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="16" cy="16" r="14" fill="url(#userGrad)" opacity="0.3" filter="url(#pulse)"/>
          <circle cx="16" cy="16" r="8" fill="url(#userGrad)" filter="url(#pulse)"/>
          <circle cx="16" cy="16" r="4" fill="white"/>
        </svg>
      `),
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16),
    };
    
    return { shopMarkerIcon, userLocationIcon };
  }, [isLoaded]);
  
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
      
      // Add a small padding around bounds and ensure minimum zoom
      map.fitBounds(bounds, 50);
      
      // After fitting bounds, check if zoom is too low and adjust
      const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        if (map.getZoom() && map.getZoom()! < 11) {
          map.setZoom(12);
        }
      });
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
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 ${className}`}>
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-booqit-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-white">Loading map...</p>
        </div>
      </div>
    );
  }

  // Get map options and marker icons after Google Maps is loaded
  const mapOptions = getMapOptions();
  const markerIcons = createMarkerIcons();

  // If marker icons couldn't be created, show an error
  if (!markerIcons) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 ${className}`}>
        <p className="text-white">Error loading Google Maps</p>
      </div>
    );
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
            icon={shopMarkerIcon}
          />
        ) : null}
      </GoogleMap>
      
      {/* Enhanced floating locate button with gradient */}
      <Button
        onClick={centerOnUserLocation}
        className="absolute bottom-20 right-4 h-12 w-12 rounded-full shadow-xl bg-gradient-to-r from-booqit-primary to-booqit-secondary hover:from-booqit-secondary hover:to-booqit-primary text-white p-0 z-10 border-2 border-white/20 backdrop-blur-sm"
        aria-label="Center on my location"
      >
        <Locate className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default React.memo(GoogleMapComponent);
