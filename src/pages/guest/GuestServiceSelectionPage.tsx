
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Clock, Plus, Minus, Check } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  image_url?: string;
}

interface Merchant {
  id: string;
  shop_name: string;
  category: string;
  address: string;
  description?: string;
  open_time: string;
  close_time: string;
  rating?: number;
  image_url?: string;
}

const GuestServiceSelectionPage: React.FC = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const guestInfo = location.state?.guestInfo || JSON.parse(sessionStorage.getItem('guestBookingInfo') || '{}');

  useEffect(() => {
    if (!guestInfo.name || !guestInfo.phone) {
      navigate(`/book/${merchantId}`);
      return;
    }
    
    fetchMerchantData();
  }, [merchantId, guestInfo]);

  const fetchMerchantData = async () => {
    if (!merchantId) return;
    
    setIsLoading(true);
    try {
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (merchantError) throw merchantError;
      setMerchant(merchantData);

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('merchant_id', merchantId);

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

    } catch (error) {
      console.error('Error fetching merchant data:', error);
      toast.error('Failed to load shop information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceToggle = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleContinue = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
    const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

    // Navigate to staff selection page
    navigate(`/guest-staff/${merchantId}`, { 
      state: { 
        guestInfo, 
        merchant, 
        selectedServices,
        totalPrice,
        totalDuration,
        isGuestBooking: true 
      }
    });
  };

  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Shop Not Found</h1>
          <p className="text-gray-600">The booking link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute left-0 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium font-righteous">Select Services</h1>
        </div>
      </div>

      <div className="p-4">
        {/* Selection Summary */}
        {selectedServices.length > 0 && (
          <Card className="mb-6 border-booqit-primary/20">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 font-righteous">Selected Services</h3>
              <div className="space-y-2">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-center text-sm">
                    <span className="font-poppins">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-poppins">
                        {service.duration}min
                      </Badge>
                      <span className="font-semibold">₹{service.price}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between items-center font-semibold">
                  <span className="font-poppins">Total: {totalDuration} min</span>
                  <span>₹{totalPrice}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-righteous">Choose Services</h3>
          {services.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 font-poppins">No services available at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {services.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                
                return (
                  <motion.div
                    key={service.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-booqit-primary bg-booqit-primary/5 shadow-md' 
                          : 'hover:shadow-md border-l-4 border-l-gray-200 hover:border-l-booqit-primary'
                      }`}
                      onClick={() => handleServiceToggle(service)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              <Checkbox 
                                checked={isSelected}
                                onChange={() => {}}
                                className="data-[state=checked]:bg-booqit-primary data-[state=checked]:border-booqit-primary"
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg mb-1 font-righteous">{service.name}</h4>
                              {service.description && (
                                <p className="text-gray-600 text-sm mb-2 font-poppins">{service.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1 font-poppins">
                                  <Clock className="h-4 w-4" />
                                  {service.duration} min
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-booqit-primary">
                              ₹{service.price}
                            </div>
                            {isSelected && (
                              <div className="flex items-center justify-end mt-1">
                                <Check className="h-4 w-4 text-booqit-primary" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handleContinue}
          disabled={selectedServices.length === 0}
        >
          {selectedServices.length > 0 
            ? `Continue with ${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} (₹${totalPrice})`
            : 'Select at least one service'
          }
        </Button>
      </div>
    </div>
  );
};

export default GuestServiceSelectionPage;
