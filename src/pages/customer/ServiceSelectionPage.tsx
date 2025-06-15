
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Service, Merchant } from '@/types';
import { toast } from 'sonner';

const ServiceSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Defensive fallback for location.state
  const merchantFromState = location.state?.merchant || null;
  const initialServices = location.state?.services || null;

  const [merchant, setMerchant] = useState<Merchant | null>(merchantFromState);
  const [services, setServices] = useState<Service[]>(initialServices || []);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch merchant if missing
  useEffect(() => {
    const fetchMerchant = async () => {
      if (!merchant && merchantId) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('merchants')
            .select('*')
            .eq('id', merchantId)
            .single();
          if (error) throw error;
          setMerchant(data);
        } catch (err) {
          setError('Could not load merchant details');
        } finally {
          setLoading(false);
        }
      }
    };
    fetchMerchant();
    // Only run on mount or if merchant is not loaded yet
    // eslint-disable-next-line
  }, [merchantId, merchant]);

  // Fetch services if missing
  useEffect(() => {
    if ((!services || services.length === 0) && merchantId) {
      fetchServices();
    }
    // eslint-disable-next-line
  }, [merchantId]);

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
    } catch (err) {
      setError('Could not load services');
    } finally {
      setLoading(false);
    }
  };

  const selectService = (service: Service) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    if (isSelected) {
      setSelectedServices(prev => prev.filter(s => s.id !== service.id));
    } else {
      setSelectedServices(prev => [...prev, service]);
    }
  };

  // Calculate total price and duration for all selected services
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

  const handleContinue = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    // Make sure merchant is available before navigating
    if (!merchant) {
      toast.error('Merchant information missing');
      return;
    }
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

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Merchant information not available.</p>
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
          <h2 className="text-lg font-semibold mb-2">Choose Your Services</h2>
          <p className="text-gray-500 text-sm">Select one or more services you'd like to book</p>
        </div>

        {services.length > 0 ? (
          <div className="space-y-4 mb-6">
            {services.map(service => {
              const isSelected = selectedServices.some(s => s.id === service.id);

              return (
                <Card 
                  key={service.id} 
                  className={`overflow-hidden cursor-pointer transition-all ${
                    isSelected ? 'border-booqit-primary bg-booqit-primary/5' : 'border-gray-200'
                  }`}
                  onClick={() => selectService(service)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{service.name}</h3>
                      <span className="font-medium">₹{service.price}</span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3">{service.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{service.duration} mins</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'bg-booqit-primary border-booqit-primary' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No services available</p>
          </div>
        )}

        {selectedServices.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Selected Services</h3>
              {selectedServices.map((service, index) => (
                <div key={service.id} className="flex justify-between text-sm mb-2">
                  <span>{service.name}</span>
                  <span>₹{service.price} ({service.duration} mins)</span>
                </div>
              ))}
              <Separator className="my-3" />
              <div className="flex justify-between font-semibold">
                <span>Total ({totalDuration} mins)</span>
                <span>₹{totalPrice}</span>
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
          Continue to Stylist Selection
        </Button>
      </div>
    </div>
  );
};

export default ServiceSelectionPage;

