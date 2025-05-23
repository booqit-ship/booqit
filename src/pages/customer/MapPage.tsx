
import React from 'react';
import MapView from '@/components/customer/MapView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 flex items-center shadow-sm z-10">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Nearby Services</h1>
      </div>
      <div className="flex-grow relative">
        <div className="absolute inset-0">
          <MapView />
        </div>
      </div>
    </div>
  );
};

export default MapPage;
