
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MapPin, Clock, Star, Phone, Mail, User } from 'lucide-react';

interface MerchantData {
  id: string;
  shop_name: string;
  category: string;
  address: string;
  description: string | null;
  open_time: string;
  close_time: string;
  rating: number | null;
  image_url: string | null;
}

interface ServiceData {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
  image_url: string | null;
}

interface ReviewData {
  id: string;
  rating: number;
  review: string;
  customer_name: string;
  customer_avatar: string | null;
  created_at: string;
}

interface GuestInfo {
  name: string;
  phone: string;
  email?: string;
}

const GuestShopDetailsPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const guestInfo: GuestInfo = location.state?.guestInfo || JSON.parse(sessionStorage.getItem('guestBookingInfo') || '{}');

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
      // Fetch merchant data with explicit typing
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id, shop_name, category, address, description, open_time, close_time, rating, image_url')
        .eq('id', merchantId)
        .single();
      
      if (merchantError) {
        console.error('Merchant fetch error:', merchantError);
        throw merchantError;
      }
      
      if (merchantData) {
        // Manually construct the merchant object to avoid type issues
        const merchantObj: MerchantData = {
          id: merchantData.id,
          shop_name: merchantData.shop_name,
          category: merchantData.category,
          address: merchantData.address,
          description: merchantData.description,
          open_time: merchantData.open_time,
          close_time: merchantData.close_time,
          rating: merchantData.rating,
          image_url: merchantData.image_url
        };
        setMerchant(merchantObj);
      }

      // Fetch services with explicit typing
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, price, duration, description, image_url')
        .eq('merchant_id', merchantId)
        .order('name', { ascending: true });
      
      if (servicesError) {
        console.error('Services fetch error:', servicesError);
        throw servicesError;
      }
      
      if (servicesData) {
        // Manually construct the services array
        const servicesArray: ServiceData[] = servicesData.map(item => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          duration: Number(item.duration),
          description: item.description,
          image_url: item.image_url
        }));
        setServices(servicesArray);
      }

      // Fetch reviews with explicit typing
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, rating, review, customer_name, customer_avatar, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (reviewsError) {
        console.error('Reviews fetch error:', reviewsError);
        setReviews([]);
      } else if (reviewsData) {
        // Manually construct the reviews array
        const reviewsArray: ReviewData[] = reviewsData.map(item => ({
          id: item.id,
          rating: Number(item.rating),
          review: item.review,
          customer_name: item.customer_name,
          customer_avatar: item.customer_avatar,
          created_at: item.created_at
        }));
        setReviews(reviewsArray);
      }

    } catch (error) {
      console.error('Error fetching merchant data:', error);
      toast.error('Failed to load shop information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueBooking = () => {
    navigate(`/guest-services/${merchantId}`, { 
      state: { 
        guestInfo,
        merchant,
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
          <h1 className="text-xl font-medium font-righteous">{merchant.shop_name}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Guest Info Display */}
        <Card className="border-booqit-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-booqit-primary/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-booqit-primary" />
              </div>
              <div>
                <h3 className="font-medium font-righteous">Booking for: {guestInfo.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1 font-poppins">
                    <Phone className="h-3 w-3" />
                    {guestInfo.phone}
                  </span>
                  {guestInfo.email && (
                    <span className="flex items-center gap-1 font-poppins">
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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {merchant.image_url && (
                <img 
                  src={merchant.image_url} 
                  alt={merchant.shop_name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold font-righteous">{merchant.shop_name}</h2>
                  {merchant.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{merchant.rating}</span>
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="mb-3 font-poppins">
                  {merchant.category}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-poppins">{merchant.address}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                  <Clock className="h-4 w-4" />
                  <span className="font-poppins">{merchant.open_time} - {merchant.close_time}</span>
                </div>
                {merchant.description && (
                  <p className="text-sm text-gray-600 font-poppins">{merchant.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Preview */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 font-righteous">Our Services</h3>
            <div className="space-y-3">
              {services.slice(0, 3).map((service) => (
                <div key={service.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium font-poppins">{service.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>{service.duration} min</span>
                    </div>
                  </div>
                  <span className="font-semibold text-booqit-primary">₹{service.price}</span>
                </div>
              ))}
              {services.length > 3 && (
                <p className="text-sm text-gray-500 text-center font-poppins">
                  +{services.length - 3} more services available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        {reviews.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 font-righteous">Recent Reviews</h3>
              <div className="space-y-4">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {review.customer_avatar ? (
                          <img 
                            src={review.customer_avatar} 
                            alt={review.customer_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm font-poppins">{review.customer_name}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-3 w-3 ${
                                  i < review.rating 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-gray-300'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                        {review.review && (
                          <p className="text-sm text-gray-600 font-poppins">{review.review}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handleContinueBooking}
        >
          Continue to Book Services
        </Button>
      </div>
    </div>
  );
};

export default GuestShopDetailsPage;
