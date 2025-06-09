
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/types';
import { toast } from 'sonner';

const ServiceSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, services: initialServices } = location.state;

  const [services, setServices] = useState<Service[]>(initialServices || []);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialServices || initialServices.length === 0) {
      fetchServices();
    }
  }, [merchantId, initialServices]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      if (!merchantId) return;

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('merchant_id', merchantId);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Could not load services');
    } finally {
      setLoading(false);
    }
  };

  const addService = (service: Service) => {
    setSelectedServices(prev => [...prev, service]);
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const isServiceSelected = (serviceId: string) => {
    return selectedServices.some(s => s.id === serviceId);
  };

  const getServiceCount = (serviceId: string) => {
    return selectedServices.filter(s => s.id === serviceId).length;
  };

  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

  const handleContinue = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    console.log('MULTIPLE_SERVICES_SELECTION: Selected services:', {
      count: selectedServices.length,
      services: selectedServices.map(s => ({ name: s.name, duration: s.duration, price: s.price })),
      totalDuration,
      totalPrice
    });

    navigate(`/booking/${merchantId}/staff`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration
      }
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
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
          <h1 className="text-xl font-medium font-righteous">Select Services</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 font-righteous">Choose Your Services</h2>
          <p className="text-gray-500 text-sm font-poppins">Select one or more services for your appointment</p>
        </div>

        {services.length > 0 ? (
          <div className="space-y-4 mb-6">
            {services.map(service => {
              const serviceCount = getServiceCount(service.id);
              const isSelected = isServiceSelected(service.id);

              return (
                <Card 
                  key={service.id} 
                  className={`overflow-hidden transition-all ${
                    isSelected ? 'border-booqit-primary bg-booqit-primary/5' : 'border-gray-200'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium font-poppins">{service.name}</h3>
                      <span className="font-medium font-poppins">₹{service.price}</span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3 font-poppins">{service.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        <span className="font-poppins">{service.duration} mins</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {isSelected && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => removeService(service.id)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium font-poppins">{serviceCount}</span>
                          </>
                        )}
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => addService(service)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 font-poppins">No services available</p>
          </div>
        )}

        {selectedServices.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 font-righteous">Selected Services</h3>
              <div className="space-y-2">
                {selectedServices.map((service, index) => (
                  <div key={`${service.id}-${index}`} className="flex justify-between text-sm">
                    <span className="font-poppins">{service.name}</span>
                    <span className="font-poppins">₹{service.price}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between font-semibold">
                <span className="font-righteous">Total ({totalDuration} mins)</span>
                <span className="font-righteous">₹{totalPrice}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handleContinue}
          disabled={selectedServices.length === 0}
        >
          Continue to Stylist Selection ({selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''})
        </Button>
      </div>
    </div>
  );
};

export default ServiceSelectionPage;
