
import React, { useState } from 'react';
import MapView from '@/components/customer/MapView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Map } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [showFullMap, setShowFullMap] = useState(false);
  
  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden">
      <div className="p-4 flex items-center bg-white shadow-sm z-10 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => showFullMap ? setShowFullMap(false) : navigate(-1)}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Nearby Services</h1>
      </div>
      
      {!showFullMap ? (
        <div className="flex-grow flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <Map className="h-16 w-16 mx-auto mb-4 text-booqit-primary opacity-70" />
            <h2 className="text-xl font-semibold mb-2">Discover Nearby Services</h2>
            <p className="text-gray-600 mb-6">
              Explore services within 5km of your location for booking appointments
            </p>
            <Button 
              size="lg" 
              onClick={() => setShowFullMap(true)}
              className="w-full"
            >
              Explore Map
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-grow relative">
          <MapView isFullMap={true} />
        </div>
      )}
    </div>
  );
};

export default MapPage;
