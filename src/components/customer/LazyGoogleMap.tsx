
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Merchant } from '@/types';

interface LazyGoogleMapProps {
  center: { lat: number; lng: number } | null;
  merchants: Merchant[];
}

const LazyGoogleMap: React.FC<LazyGoogleMapProps> = ({ center, merchants }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          // Lazy load the map component
          import('@/components/common/GoogleMap').then((module) => {
            setMapComponent(() => module.default);
          }).catch(() => {
            console.log('Map component not available');
          });
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Load before it becomes visible
      }
    );

    if (mapRef.current) {
      observer.observe(mapRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div ref={mapRef}>
      <h2 className="text-xl font-semibold mb-4 flex justify-between items-center">
        <span className="font-normal">Explore Map</span>
        <Button size="sm" variant="link" onClick={() => navigate('/map')}>
          View Full Map
        </Button>
      </h2>
      <Card className="overflow-hidden shadow-md bg-gray-100 h-48 relative">
        {isVisible && MapComponent && center ? (
          <MapComponent
            center={center}
            zoom={12}
            className="h-full"
            markers={merchants.slice(0, 6).map(shop => ({
              lat: shop.lat,
              lng: shop.lng,
              title: shop.shop_name
            }))}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-2 animate-pulse"></div>
              <p className="text-sm text-gray-500">Loading map...</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-100 hover:opacity-0 transition-opacity duration-300">
          <Button 
            className="bg-booqit-primary hover:bg-booqit-primary/90" 
            onClick={() => navigate('/map')}
          >
            Open Map View
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(LazyGoogleMap);
