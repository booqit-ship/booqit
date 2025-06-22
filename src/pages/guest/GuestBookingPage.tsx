import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MapPin, Clock, Star, Phone, Mail, User } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

interface Staff {
  id: string;
  name: string;
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

const GuestBookingPage: React.FC = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get guest info from session storage or location state
  const guestInfo = location.state?.guestInfo || JSON.parse(sessionStorage.getItem('guestBookingInfo') || '{}');

  useEffect(() => {
    if (!guestInfo.name || !guestInfo.phone) {
      // Redirect back to guest info page if no guest info
      navigate(`/book/${merchantId}`);
      return;
    }
    
    fetchMerchantData();
  }, [merchantId, guestInfo]);

  const fetchMerchantData = async () => {
    if (!merchantId) return;
    
    setIsLoading(true);
    try {
      // Fetch merchant data
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (merchantError) throw merchantError;
      setMerchant(merchantData);

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('merchant_id', merchantId);

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('merchant_id', merchantId);

      if (staffError) throw staffError;
      setStaff(staffData || []);

    } catch (error) {
      console.error('Error fetching merchant data:', error);
      toast({
        title: "Error",
        description: "Failed to load shop information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    // Store selected service and navigate to guest datetime selection
    sessionStorage.setItem('selectedService', JSON.stringify(service));
    navigate(`/guest-datetime/${merchantId}`, { 
      state: { 
        guestInfo, 
        merchant, 
        selectedServices: [service],
        totalPrice: service.price,
        totalDuration: service.duration,
        selectedStaff: null,
        selectedStaffDetails: null,
        isGuestBooking: true 
      }
    });
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/book/${merchantId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{merchant.shop_name}</h1>
            <p className="text-sm text-gray-600">Select a service</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Guest Info Display */}
        <Card className="mb-6 border-booqit-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-booqit-primary/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-booqit-primary" />
              </div>
              <div>
                <h3 className="font-medium">Booking for: {guestInfo.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {guestInfo.phone}
                  </span>
                  {guestInfo.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {guestInfo.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shop Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {merchant.image_url && (
                <img 
                  src={merchant.image_url} 
                  alt={merchant.shop_name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold">{merchant.shop_name}</h2>
                  {merchant.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{merchant.rating}</span>
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="mb-2">
                  {merchant.category}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                  <MapPin className="h-4 w-4" />
                  <span>{merchant.address}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{merchant.open_time} - {merchant.close_time}</span>
                </div>
                {merchant.description && (
                  <p className="text-sm text-gray-600 mt-2">{merchant.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Choose a Service</h3>
          {services.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No services available at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <motion.div
                  key={service.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-booqit-primary"
                    onClick={() => handleServiceSelect(service)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{service.name}</h4>
                          {service.description && (
                            <p className="text-gray-600 text-sm mb-2">{service.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {service.duration} min
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-booqit-primary">
                            ₹{service.price}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestBookingPage;
