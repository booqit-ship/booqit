
import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader, InfoWindow } from '@react-google-maps/api';

const googleMapsApiKey = 'AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
};

// Custom marker icon for shops
const shopMarkerIcon = {
  path: 'M10.453 14.016l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM12 2.016q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z',
  fillColor: '#7E57C2',
  fillOpacity: 1,
  strokeColor: '#5E35B1',
  strokeWeight: 1,
  scale: 1.5,
};

// Custom marker icon for user location
const userLocationIcon = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  fillColor: '#3B82F6',
  fillOpacity: 1,
  strokeColor: '#1D4ED8',
  strokeWeight: 1,
  scale: 1.5,
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
  zoom = 13,
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

  // Custom map style for more visual appeal
  const mapStyles = [
    {
      "featureType": "administrative",
      "elementType": "labels.text.fill",
      "stylers": [{"color": "#444444"}]
    },
    {
      "featureType": "landscape",
      "elementType": "all",
      "stylers": [{"color": "#f2f2f2"}]
    },
    {
      "featureType": "poi",
      "elementType": "all",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "road",
      "elementType": "all",
      "stylers": [{"saturation": -100}, {"lightness": 45}]
    },
    {
      "featureType": "road.highway",
      "elementType": "all",
      "stylers": [{"visibility": "simplified"}]
    },
    {
      "featureType": "road.arterial",
      "elementType": "labels.icon",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "transit",
      "elementType": "all",
      "stylers": [{"visibility": "off"}]
    },
    {
      "featureType": "water",
      "elementType": "all",
      "stylers": [{"color": "#c4e8f3"}, {"visibility": "on"}]
    }
  ];

  return isLoaded ? (
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
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: false, // Removed zoom controls as requested
          styles: mapStyles,
          gestureHandling: 'greedy' // Makes the map more mobile-friendly
        }}
      >
        {/* User location marker (blue) */}
        {showUserLocation && userLocation && (
          <Marker
            position={userLocation}
            icon={userLocationIcon}
            title="Your Location"
            zIndex={1000} // Make sure user location is on top of other markers
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
            />
          ))
        ) : draggableMarker ? (
          <Marker
            position={center}
            draggable={true}
            onDragEnd={onMarkerDragEnd}
          />
        ) : null}
      </GoogleMap>
    </div>
  ) : <div className={`flex items-center justify-center bg-gray-200 ${className}`}>Loading map...</div>;
};

export default GoogleMapComponent;
