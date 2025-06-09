
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Package, Plus, Minus, CheckCircle } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  image_url: string | null;
}

interface ServiceSelection {
  id: string;
  name: string;
  price: number;
  duration: number;
}

const ServiceSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!merchantId) return;

      try {
        // Fetch merchant info
        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('shop_name')
          .eq('id', merchantId)
          .single();

        if (merchantError) throw merchantError;
        setMerchantName(merchant?.shop_name || '');

        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('merchant_id', merchantId)
          .order('name');

        if (servicesError) throw servicesError;
        setServices(servicesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [merchantId]);

  const handleServiceToggle = (service: Service) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    
    if (isSelected) {
      setSelectedServices(prev => prev.filter(s => s.id !== service.id));
    } else {
      setSelectedServices(prev => [...prev, {
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.duration
      }]);
    }
  };

  const handleContinue = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    // Pass selected services to staff selection
    navigate(`/staff-selection/${merchantId}`, {
      state: { selectedServices }
    });
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, service) => sum + service.price, 0);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((sum, service) => sum + service.duration, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-light mb-2">Select Services</h1>
        <p className="text-gray-600">{merchantName}</p>
      </div>

      {selectedServices.length > 0 && (
        <Card className="mb-6 border-booqit-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Selected Services ({selectedServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex justify-between items-center text-sm">
                  <span>{service.name}</span>
                  <span>₹{service.price}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center font-semibold">
                <div>
                  <p>Total: ₹{getTotalPrice()}</p>
                  <p className="text-sm text-gray-600 font-normal">{getTotalDuration()} minutes</p>
                </div>
                <Button onClick={handleContinue} size="sm">
                  Continue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {services.map((service) => {
          const isSelected = selectedServices.some(s => s.id === service.id);
          
          return (
            <Card 
              key={service.id} 
              className={`cursor-pointer transition-all ${
                isSelected ? 'border-booqit-primary bg-booqit-primary/5' : 'hover:shadow-md'
              }`}
              onClick={() => handleServiceToggle(service)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{service.name}</h3>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-booqit-primary" />
                      )}
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{service.duration} min</span>
                      </div>
                      <Badge variant="secondary">₹{service.price}</Badge>
                    </div>
                  </div>
                  
                  {service.image_url && (
                    <img 
                      src={service.image_url} 
                      alt={service.name}
                      className="w-16 h-16 object-cover rounded-lg ml-4"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No services available</p>
        </div>
      )}
    </div>
  );
};

export default ServiceSelectionPage;
