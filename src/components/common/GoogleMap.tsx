
import React, { useCallback, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

const googleMapsApiKey = 'AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
};

// Custom marker styles
const userLocationIcon = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  fillColor: '#4285F4',
  fillOpacity: 1,
  strokeColor: '#FFFFFF',
  strokeWeight: 2,
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
  const [activeMarker, setActiveMarker] = useState<number | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = (index: number) => {
    setActiveMarker(index);
    if (onMarkerClick) onMarkerClick(index);
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    setActiveMarker(null);
    if (onClick) onClick(e);
  };

  return isLoaded ? (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        }}
      >
        {/* Show user location marker if requested */}
        {showUserLocation && center && (
          <Marker
            position={center}
            icon={userLocationIcon}
            zIndex={1000}
            animation={google.maps.Animation.DROP}
            title="Your location"
          >
            <InfoWindow position={center}>
              <div className="p-1 text-sm font-medium">Your location</div>
            </InfoWindow>
          </Marker>
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
              onClick={() => handleMarkerClick(index)}
              animation={google.maps.Animation.DROP}
              label={{
                text: (index + 1).toString(),
                color: "white",
                fontSize: "12px",
              }}
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
  ) : (
    <div className={`flex items-center justify-center bg-gray-200 ${className}`}>
      <div className="bg-white p-4 rounded shadow-md">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-2 text-center">Loading map...</p>
      </div>
    </div>
  );
};

export default GoogleMapComponent;
