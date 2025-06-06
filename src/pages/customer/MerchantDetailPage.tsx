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
    return category.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ').replace('Shop', '');
  };

  const getGenderSpecification = (merchant: Merchant) => {
    // Use gender_focus from the Merchant type and format it properly
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
    navigate(`/booking/${merchantId}`, {
      state: {
        merchant,
        services
      }
    });
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>;
  }

  if (!merchant) {
    return <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Merchant not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>;
  }

  return <div className="pb-20">
      <div className="relative h-64 bg-gray-200">
        <img src={imageError ? 'https://images.unsplash.com/photo-1582562124811-c09040d0a901' : getMerchantImage(merchant)} alt={merchant.shop_name} className="w-full h-full object-cover" onError={handleImageError} />
        <Button variant="outline" size="icon" className="absolute top-4 left-4 bg-white/80 hover:bg-white" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-4 -mt-6 rounded-t-xl bg-white relative">
        <div className="flex justify-between items-start mb-3">
          <h1 className="text-2xl font-light">{merchant.shop_name}</h1>
          {merchant.rating && (
            <div className="flex items-center text-yellow-500">
              <Star className="fill-yellow-500 stroke-yellow-500 h-4 w-4 mr-1" />
              <span>{merchant.rating}</span>
            </div>
          )}
        </div>
        
        <p className="text-gray-500 mb-4">{formatCategory(merchant.category)}</p>
        
        <div className="flex items-center text-gray-500 mb-2">
          <MapPin className="h-4 w-4 mr-2" />
          <p>{merchant.address}</p>
        </div>
        
        <div className="flex items-center text-gray-500 mb-4">
          <Clock className="h-4 w-4 mr-2" />
          <p>{getFormattedTime(merchant.open_time)} - {getFormattedTime(merchant.close_time)}</p>
        </div>

        {/* Gender Specification */}
        <div className="mb-3">
          <Badge variant="outline" className="text-sm">
            {getGenderSpecification(merchant)}
          </Badge>
        </div>

        {/* Staff Section */}
        {staff.length > 0 && <div className="mb-4">
            <h3 className="font-medium mb-2">Available Stylists</h3>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-gray-700">{formatStylistDisplay(staff)}</span>
            </div>
          </div>}
        
        <Separator className="mb-6" />

        {/* Book Services Button */}
        {services.length > 0 && <div className="mb-6">
            <Button size="lg" onClick={handleBookServices} className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-base font-medium">
              Book Services
            </Button>
          </div>}
        
        {/* Services and Reviews Tabs */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="services" className="mt-6">
            {services.length > 0 ? <div className="space-y-4">
                {services.map(service => <Card key={service.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{service.name}</h3>
                        <span className="font-medium">₹{service.price}</span>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-3">{service.description}</p>
                      
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{service.duration} mins</span>
                      </div>
                    </CardContent>
                  </Card>)}
              </div> : <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No services available</p>
              </div>}
          </TabsContent>
          
          <TabsContent value="reviews" className="mt-6">
            <ReviewsSection merchantId={merchantId!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};

export default MerchantDetailPage;
