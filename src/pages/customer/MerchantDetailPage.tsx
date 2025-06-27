import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, MapPin, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Merchant, Service, Staff } from '@/types';
import { toast } from 'sonner';
import ReviewsSection from '@/components/customer/ReviewsSection';

const MerchantDetailPage: React.FC = () => {
  const {
    merchantId
  } = useParams<{
    merchantId: string;
  }>();
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

        // Fetch merchant details
        const {
          data: merchantData,
          error: merchantError
        } = await supabase.from('merchants').select('*').eq('id', merchantId).single();
        if (merchantError) throw merchantError;

        // Fetch services for this merchant
        const {
          data: servicesData,
          error: servicesError
        } = await supabase.from('services').select('*').eq('merchant_id', merchantId);
        if (servicesError) throw servicesError;

        // Fetch staff for this merchant
        const {
          data: staffData,
          error: staffError
        } = await supabase.from('staff').select('*').eq('merchant_id', merchantId);
        if (staffError) throw staffError;
        console.log('Merchant data:', merchantData);
        console.log('Staff data:', staffData);
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

    // Forcefully provide both merchant and services as state on navigation
    navigate(`/booking/${merchantId}/services`, {
      state: {
        merchant,
        services,
      }
    });
  };

  if (loading) {
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
          <p className="text-gray-600 font-poppins mb-4">Unable to load shop information</p>
          <Button onClick={() => navigate(-1)} className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
            Go Back
          </Button>
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
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-medium font-righteous">{merchant.shop_name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Shop Info Card */}
        <Card className="mb-6 shadow-lg border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <img 
                src={imageError ? 'https://images.unsplash.com/photo-1582562124811-c09040d0a901' : getMerchantImage(merchant)} 
                alt={merchant.shop_name} 
                className="w-20 h-20 rounded-lg object-cover shadow-lg"
                onError={handleImageError}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold font-righteous text-gray-800">{merchant.shop_name}</h2>
                  {merchant.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{merchant.rating}</span>
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="mb-3 font-poppins">
                  {formatCategory(merchant.category)}
                </Badge>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="font-poppins">{merchant.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="font-poppins">{getFormattedTime(merchant.open_time)} - {getFormattedTime(merchant.close_time)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gender Specification */}
            <div className="mt-4">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {getGenderSpecification(merchant)}
              </Badge>
            </div>

            {/* Staff Section */}
            {staff.length > 0 && (
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800 font-poppins">
                    Available Stylists: {formatStylistDisplay(staff)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Book Services Button */}
        {services.length > 0 && (
          <div className="mb-6">
            <Button 
              onClick={handleBookServices} 
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-lg py-6 font-poppins font-medium shadow-lg"
              size="lg"
            >
              Book Services
            </Button>
          </div>
        )}
        
        {/* Services and Reviews Tabs */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white shadow-lg">
            <TabsTrigger value="services" className="font-poppins">Services</TabsTrigger>
            <TabsTrigger value="reviews" className="font-poppins">Reviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="services" className="mt-6">
            {services.length > 0 ? (
              <div className="space-y-4">
                {services.map(service => (
                  <Card key={service.id} className="shadow-lg border-gray-200 hover:shadow-xl transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg font-righteous text-gray-800">{service.name}</h3>
                        <span className="text-2xl font-bold text-purple-600">₹{service.price}</span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 font-poppins leading-relaxed">{service.description}</p>
                      
                      <div className="flex items-center text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full w-fit">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="font-poppins">{service.duration} mins</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-lg">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500 font-poppins">No services available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="reviews" className="mt-6">
            <ReviewsSection merchantId={merchantId!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MerchantDetailPage;
