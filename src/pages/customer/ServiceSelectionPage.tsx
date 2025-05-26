
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, Plus, Minus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Merchant, Service } from '@/types';
import { toast } from 'sonner';

interface SelectedService extends Service {
  quantity: number;
}

const ServiceSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, services } = location.state as { merchant: Merchant; services: Service[] };

  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const existing = prev.find(s => s.id === service.id);
      if (existing) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, { ...service, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (serviceId: string, change: number) => {
    setSelectedServices(prev => 
      prev.map(service => {
        if (service.id === serviceId) {
          const newQuantity = Math.max(1, service.quantity + change);
          return { ...service, quantity: newQuantity };
        }
        return service;
      }).filter(service => service.quantity > 0)
    );
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((total, service) => total + (service.price * service.quantity), 0);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((total, service) => total + (service.duration * service.quantity), 0);
  };

  const handleContinue = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    navigate(`/booking/${merchantId}/staff`, {
      state: {
        merchant,
        selectedServices,
        totalPrice: getTotalPrice(),
        totalDuration: getTotalDuration()
      }
    });
  };

  if (!merchant || !services) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Service or merchant not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-white min-h-screen">
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-0 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">Select Services</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{merchant.shop_name}</h2>
          <p className="text-gray-500 text-sm">Choose the services you want to book</p>
        </div>

        <div className="space-y-4 mb-6">
          {services.map(service => {
            const selectedService = selectedServices.find(s => s.id === service.id);
            const isSelected = !!selectedService;

            return (
              <Card key={service.id} className={`border transition-all ${isSelected ? 'border-booqit-primary bg-booqit-primary/5' : 'border-gray-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleService(service)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium">{service.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center text-gray-500 text-sm">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{service.duration} mins</span>
                          </div>
                          <span className="font-medium">₹{service.price}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(service.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{selectedService?.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(service.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedServices.length > 0 && (
          <Card className="mb-4 border-booqit-primary">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Booking Summary</h3>
              <div className="space-y-2">
                {selectedServices.map(service => (
                  <div key={service.id} className="flex justify-between text-sm">
                    <span>{service.name} x{service.quantity}</span>
                    <span>₹{service.price * service.quantity}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Duration</span>
                    <span>{getTotalDuration()} mins</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Amount</span>
                    <span>₹{getTotalPrice()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handleContinue}
          disabled={selectedServices.length === 0}
        >
          Continue ({selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''})
        </Button>
      </div>
    </div>
  );
};

export default ServiceSelectionPage;
