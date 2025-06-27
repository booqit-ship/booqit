
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ShoppingCart, Star, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Service, Merchant } from '@/types';
import { toast } from 'sonner';
import { PageHeader } from '@/components/booking/PageHeader';
import { AnimatedCard } from '@/components/booking/AnimatedCard';
import { AnimatedButton } from '@/components/booking/AnimatedButton';
import { FloatingBottomBar } from '@/components/booking/FloatingBottomBar';

const ServiceSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { merchant: initialMerchant, services: initialServices } = location.state || {};
  const [merchant, setMerchant] = useState<Merchant | null>(initialMerchant || null);
  const [services, setServices] = useState<Service[]>(initialServices || []);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we don't have merchant or services data, fetch them
    if (!merchant || !services.length) {
      fetchMerchantAndServices();
    }
  }, [merchantId]);

  const fetchMerchantAndServices = async () => {
    try {
      setLoading(true);
      if (!merchantId) {
        toast.error('Merchant ID is missing');
        navigate('/home');
        return;
      }

      console.log('BOOKING_FLOW: Fetching merchant and services for:', merchantId);

      // Fetch merchant details
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (merchantError) {
        console.error('Error fetching merchant:', merchantError);
        toast.error('Could not load merchant details');
        navigate('/home');
        return;
      }

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('merchant_id', merchantId);

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        toast.error('Could not load services');
        return;
      }

      console.log('BOOKING_FLOW: Fetched data:', {
        merchant: merchantData?.shop_name,
        servicesCount: servicesData?.length || 0
      });

      setMerchant(merchantData);
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error fetching merchant and services:', error);
      toast.error('Could not load booking data');
      navigate('/home');
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

  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

  const handleContinue = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    if (!merchant) {
      toast.error('Merchant information is missing');
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
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <p className="text-gray-500 mb-4 font-poppins">Unable to load merchant information</p>
          <AnimatedButton onClick={() => navigate('/home')} gradient>
            Go to Home
          </AnimatedButton>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 pb-32">
      <PageHeader
        title="Select Services"
        subtitle="Choose your preferred services"
        onBack={() => navigate(-1)}
        progress={25}
      />

      <div className="p-4">
        {/* Shop Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <AnimatedCard className="bg-white shadow-xl">
            <div className="p-4 flex items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                <span className="text-white font-righteous text-2xl">
                  {merchant.shop_name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-righteous text-xl font-bold text-gray-800">{merchant.shop_name}</h2>
                <p className="text-gray-600 font-poppins text-sm">{merchant.address}</p>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Services Grid */}
        {services.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-4 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-righteous text-xl font-bold text-gray-800">Available Services</h3>
              <div className="bg-gradient-to-r from-purple-100 to-purple-200 px-3 py-1 rounded-full">
                <span className="text-purple-700 font-poppins text-sm font-medium">
                  {services.length} services
                </span>
              </div>
            </div>

            {services.map((service, index) => {
              const isSelected = selectedServices.some(s => s.id === service.id);

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <AnimatedCard
                    selected={isSelected}
                    onClick={() => selectService(service)}
                    className="bg-white shadow-lg hover:shadow-xl"
                  >
                    <div className="p-4 relative">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-righteous text-lg font-bold text-gray-800 mb-1">
                            {service.name}
                          </h4>
                          <p className="text-gray-600 font-poppins text-sm mb-2">
                            {service.description}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <span className="font-righteous text-2xl font-bold text-purple-600">
                            ₹{service.price}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-500">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="font-poppins text-sm">{service.duration} minutes</span>
                        </div>
                        
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: isSelected ? 1 : 0.8 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                            isSelected 
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600 border-purple-500' 
                              : 'border-gray-300'
                          }`}
                        >
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: "spring", stiffness: 500 }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-white" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    </div>
                  </AnimatedCard>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-gray-50 rounded-xl"
          >
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 font-poppins text-lg">No services available</p>
          </motion.div>
        )}
      </div>

      {/* Floating Summary & Continue */}
      <AnimatePresence>
        {selectedServices.length > 0 && (
          <FloatingBottomBar>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.5 }}
            >
              {/* Summary Card */}
              <div className="bg-gradient-to-r from-purple-100 to-purple-200 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-righteous text-lg font-bold text-purple-800">
                    Selected Services ({selectedServices.length})
                  </h4>
                  <div className="text-right">
                    <p className="font-righteous text-2xl font-bold text-purple-700">₹{totalPrice}</p>
                    <p className="text-purple-600 font-poppins text-sm">{totalDuration} minutes</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {selectedServices.map((service, index) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="font-poppins text-purple-700">{service.name}</span>
                      <span className="font-poppins text-purple-600">₹{service.price}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <AnimatedButton
                onClick={handleContinue}
                size="lg"
                gradient
                className="w-full"
              >
                <Star className="w-5 h-5 mr-2" />
                Continue to Stylist Selection
              </AnimatedButton>
            </motion.div>
          </FloatingBottomBar>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceSelectionPage;
