
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Clock, Check, ChevronRight } from 'lucide-react';

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
    console.log('QUICK BOOQIT SERVICE SELECTION: Page loaded with:', { guestInfo, merchantId });
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
    console.log('SERVICE TOGGLE:', service.name);
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        const updated = prev.filter(s => s.id !== service.id);
        console.log('Service removed, updated selection:', updated.map(s => s.name));
        return updated;
      } else {
        const updated = [...prev, service];
        console.log('Service added, updated selection:', updated.map(s => s.name));
        return updated;
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

    console.log('SERVICES: Proceeding with selection:', {
      services: selectedServices.map(s => s.name),
      totalPrice,
      totalDuration
    });

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Shop Not Found</h1>
          <p className="text-gray-600 font-poppins">The booking link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="relative flex items-center justify-center">
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute left-0 text-white hover:bg-white/20 rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-medium font-righteous">Select Services</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Selection Summary */}
        {selectedServices.length > 0 && (
          <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3 font-righteous text-purple-800">Selected Services</h3>
              <div className="space-y-3">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg shadow-sm">
                    <span className="font-poppins font-medium">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-poppins text-xs">
                        {service.duration}min
                      </Badge>
                      <span className="font-semibold text-purple-600">₹{service.price}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between items-center font-semibold text-purple-800">
                  <span className="font-poppins">Total: {totalDuration} min</span>
                  <span className="text-lg">₹{totalPrice}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold font-righteous text-gray-800">Choose Services</h3>
          {services.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 font-poppins">No services available at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {services.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                
                return (
                  <Card 
                    key={service.id}
                    className={`cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                      isSelected 
                        ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg ring-2 ring-purple-200' 
                        : 'hover:shadow-lg border-gray-200 hover:border-purple-300 bg-white'
                    }`}
                    onClick={() => handleServiceToggle(service)}
                  >
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="mt-1">
                            <Checkbox 
                              checked={isSelected}
                              onChange={() => {}}
                              className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 w-5 h-5"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg mb-2 font-righteous text-gray-800">{service.name}</h4>
                            {service.description && (
                              <p className="text-gray-600 text-sm mb-3 font-poppins leading-relaxed">{service.description}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                <Clock className="h-4 w-4" />
                                <span className="font-poppins">{service.duration} min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-purple-600 mb-1">
                            ₹{service.price}
                          </div>
                          {isSelected && (
                            <div className="flex items-center justify-end">
                              <Check className="h-5 w-5 text-purple-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl">
        <div className="max-w-lg mx-auto p-4">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-lg py-6 font-poppins font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
            size="lg"
            onClick={handleContinue}
            disabled={selectedServices.length === 0}
          >
            {selectedServices.length > 0 
              ? (
                <div className="flex items-center justify-between w-full">
                  <span>Continue with {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">₹{totalPrice}</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              )
              : 'Select at least one service'
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuestServiceSelectionPage;
