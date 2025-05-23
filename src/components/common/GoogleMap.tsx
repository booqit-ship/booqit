import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

const googleMapsApiKey = 'AIzaSyB28nWHDBaEoMGIEoqfWDh6L2VRkM5AMwc';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
};

// Custom marker styles - Fixed with proper typing for Google Maps API
const userLocationIcon = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  fillColor: '#3B82F6', // Blue color for user location
  fillOpacity: 1,
  strokeColor: '#FFFFFF',
  strokeWeight: 2,
  scale: 2,
};

// Shop marker styles - Fixed with proper typing for Google Maps API
const shopMarkerIcon = {
  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  fillColor: '#9333EA', // Purple color for shops
  fillOpacity: 1,
  strokeColor: '#FFFFFF',
  strokeWeight: 2,
  scale: 1.8,
};

// Custom map styles for a more colorful look
const mapStyles = [
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "poi.business",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road.local",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#b3e6ff" }]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#f0f8f0" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffd580" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffe0b3" }]
  }
];

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
  onMyLocationClick?: () => void;
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
  onMyLocationClick,
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

  // Custom control for "My Location" button
  const createMyLocationControl = (map: google.maps.Map) => {
    const controlDiv = document.createElement('div');
    
    // Set CSS for the control
    controlDiv.className = "bg-white rounded-full shadow-lg m-4 cursor-pointer hover:bg-gray-100 transition-colors";
    
    // Set CSS for the control interior
    const controlUI = document.createElement('div');
    controlUI.className = "flex items-center justify-center h-10 w-10 rounded-full";
    controlUI.title = "Click to go to your location";
    controlDiv.appendChild(controlUI);
    
    // Set CSS for the control text
    const controlIcon = document.createElement('div');
    controlIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="1"></circle>
        <line x1="12" y1="2" x2="12" y2="4"></line>
        <line x1="12" y1="20" x2="12" y2="22"></line>
        <line x1="2" y1="12" x2="4" y2="12"></line>
        <line x1="20" y1="12" x2="22" y2="12"></line>
      </svg>
    `;
    controlUI.appendChild(controlIcon);
    
    // Setup the click event listener
    controlUI.addEventListener('click', () => {
      if (onMyLocationClick) onMyLocationClick();
    });
    
    return controlDiv;
  };

  useEffect(() => {
    if (isLoaded && map) {
      const myLocationControl = createMyLocationControl(map);
      map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(myLocationControl);
    }
  }, [isLoaded, map, onMyLocationClick]);

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
          zoomControl: false,
          styles: mapStyles,
          gestureHandling: 'greedy'
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
              onClick={() => handleMarkerClick(index)}
              animation={google.maps.Animation.DROP}
              icon={shopMarkerIcon}
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
