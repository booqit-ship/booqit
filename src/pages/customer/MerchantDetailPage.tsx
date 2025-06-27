
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock, MapPin, Star, User, Calendar, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Merchant, Service, Staff } from '@/types';
import { toast } from 'sonner';
import ReviewsSection from '@/components/customer/ReviewsSection';
import { AnimatedCard } from '@/components/booking/AnimatedCard';
import { AnimatedButton } from '@/components/booking/AnimatedButton';
import { FloatingBottomBar } from '@/components/booking/FloatingBottomBar';

const MerchantDetailPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace('Shop', '');
  };

  const getGenderSpecification = (merchant: Merchant) => {
    const genderFocus = merchant.gender_focus || "unisex";
    return genderFocus.charAt(0).toUpperCase() + genderFocus.slice(1);
  };

  const formatStylistDisplay = (staff: Staff[]) => {
    if (staff.length <= 2) {
      return staff.map(stylist => stylist.name).join(', ');
    } else {
      const firstTwo = staff.slice(0, 2).map(stylist => stylist.name).join(', ');
      const remaining = staff.length - 2;
      return `${firstTwo} +${remaining} stylists`;
    }
  };

  useEffect(() => {
    const fetchMerchantDetails = async () => {
      try {
        if (!merchantId) return;

        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', merchantId)
          .single();
        if (merchantError) throw merchantError;

        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('merchant_id', merchantId);
        if (servicesError) throw servicesError;

        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);
        if (staffError) throw staffError;

        setMerchant(merchantData);
        setServices(servicesData || []);
        setStaff(staffData || []);
      } catch (error) {
        console.error('Error fetching merchant details:', error);
        toast.error('Could not load merchant details');
      } finally {
        setLoading(false);
      }
    };
    fetchMerchantDetails();
  }, [merchantId]);

  const getFormattedTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMerchantImage = (merchant: Merchant) => {
    if (merchant.image_url) {
      if (merchant.image_url.startsWith('http')) {
        return merchant.image_url;
      }
      return `https://ggclvurfcykbwmhfftkn.supabase.co/storage/v1/object/public/merchant_images/${merchant.image_url}`;
    }
    return 'https://images.unsplash.com/photo-1582562124811-c09040d0a901';
  };

  const handleImageError = () => {
    console.error('Failed to load merchant image');
    setImageError(true);
  };

  const handleBookServices = () => {
    if (!merchant) {
      toast.error('Merchant information not loaded');
      return;
    }
    if (!services || services.length === 0) {
      toast.error('Merchant has no services');
      return;
    }

    navigate(`/booking/${merchantId}/services`, {
      state: { merchant, services }
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
          <p className="text-gray-500 mb-4 font-poppins">Merchant not found</p>
          <AnimatedButton onClick={() => navigate(-1)} gradient>
            Go Back
          </AnimatedButton>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 pb-24">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative h-80 bg-gradient-to-br from-purple-600 to-purple-800 overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/20" />
        <motion.img
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5 }}
          src={imageError ? 'https://images.unsplash.com/photo-1582562124811-c09040d0a901' : getMerchantImage(merchant)}
          alt={merchant.shop_name}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
        />
        
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 left-4 bg-white/90 hover:bg-white backdrop-blur-sm border-0 shadow-lg"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="absolute bottom-0 left-0 right-0 p-6 text-white"
        >
          <div className="flex justify-between items-end mb-2">
            <h1 className="text-3xl font-righteous font-bold">{merchant.shop_name}</h1>
            {merchant.rating && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 500 }}
                className="flex items-center bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full"
              >
                <Star className="fill-current h-4 w-4 mr-1" />
                <span className="font-bold">{merchant.rating}</span>
              </motion.div>
            )}
          </div>
          <p className="text-purple-100 font-poppins mb-2">{formatCategory(merchant.category)}</p>
          <div className="flex items-center text-purple-200 text-sm">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <p className="font-poppins">{merchant.address}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="px-4 -mt-8 relative z-10">
        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
        >
          <AnimatedCard className="bg-white shadow-xl">
            <div className="p-4 flex items-center">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 rounded-full mr-4">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-righteous text-sm text-gray-600">Opening Hours</p>
                <p className="font-poppins font-semibold text-gray-800">
                  {getFormattedTime(merchant.open_time)} - {getFormattedTime(merchant.close_time)}
                </p>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard className="bg-white shadow-xl">
            <div className="p-4 flex items-center">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-full mr-4">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-righteous text-sm text-gray-600">Gender Focus</p>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {getGenderSpecification(merchant)}
                </Badge>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Staff Section */}
        {staff.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mb-6"
          >
            <AnimatedCard className="bg-white shadow-xl">
              <div className="p-4">
                <h3 className="font-righteous text-lg mb-3 text-gray-800">Available Stylists</h3>
                <div className="flex items-center flex-wrap gap-2">
                  {staff.slice(0, 3).map((stylist, index) => (
                    <motion.div
                      key={stylist.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.1, type: "spring", stiffness: 500 }}
                      className="flex items-center bg-gradient-to-r from-purple-100 to-purple-200 px-3 py-2 rounded-full"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white font-bold text-sm">{stylist.name.charAt(0)}</span>
                      </div>
                      <span className="font-poppins text-sm font-medium text-purple-800">{stylist.name}</span>
                    </motion.div>
                  ))}
                  {staff.length > 3 && (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                      +{staff.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Services & Reviews Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <Tabs defaultValue="services" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-xl p-1">
              <TabsTrigger value="services" className="font-poppins rounded-lg">Services</TabsTrigger>
              <TabsTrigger value="reviews" className="font-poppins rounded-lg">Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="services" className="mt-6">
              {services.length > 0 ? (
                <div className="space-y-4">
                  {services.map((service, index) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                    >
                      <AnimatedCard className="bg-white shadow-lg">
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-righteous text-lg font-semibold text-gray-800">{service.name}</h3>
                            <span className="font-righteous text-xl font-bold text-purple-600">₹{service.price}</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3 font-poppins">{service.description}</p>
                          
                          <div className="flex items-center text-gray-500 text-sm">
                            <Clock className="h-4 w-4 mr-2" />
                            <span className="font-poppins">{service.duration} minutes</span>
                          </div>
                        </div>
                      </AnimatedCard>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 bg-gray-50 rounded-xl"
                >
                  <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 font-poppins">No services available</p>
                </motion.div>
              )}
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6">
              <ReviewsSection merchantId={merchantId!} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Floating Bottom Bar */}
      {services.length > 0 && (
        <FloatingBottomBar>
          <AnimatedButton
            onClick={handleBookServices}
            size="lg"
            gradient
            className="w-full"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Book Services
          </AnimatedButton>
        </FloatingBottomBar>
      )}
    </div>
  );
};

export default MerchantDetailPage;
