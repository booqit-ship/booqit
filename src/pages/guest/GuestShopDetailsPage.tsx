
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Clock, MapPin, Star, Users, Phone, Mail, ChevronRight } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

interface Review {
  id: string;
  rating: number;
  review: string;
  customer_name: string;
  created_at: string;
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

const GuestShopDetailsPage: React.FC = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const guestInfo = location.state?.guestInfo || JSON.parse(sessionStorage.getItem('guestBookingInfo') || '{}');

  useEffect(() => {
    console.log('SHOP DETAILS: Loading page with info:', guestInfo);
    
    if (!guestInfo.name || !guestInfo.phone) {
      console.log('SHOP DETAILS: Missing info, redirecting to booking form');
      navigate(`/book/${merchantId}`);
      return;
    }
    
    fetchShopData();
  }, [merchantId, navigate]);

  const fetchShopData = async () => {
    if (!merchantId) return;
    
    setIsLoading(true);
    try {
      console.log('SHOP DETAILS: Fetching merchant data for:', merchantId);
      
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (merchantError) {
        console.error('Error fetching merchant:', merchantError);
        throw merchantError;
      }
      
      console.log('SHOP DETAILS: Merchant data loaded:', merchantData.shop_name);
      setMerchant(merchantData);

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('name', { ascending: true });

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        throw servicesError;
      }
      
      console.log('SHOP DETAILS: Services loaded:', servicesData?.length || 0);
      setServices(servicesData || []);

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          review,
          customer_name,
          created_at
        `)
        .eq('booking_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!reviewsError && reviewsData) {
        console.log('SHOP DETAILS: Reviews loaded:', reviewsData.length);
        setReviews(reviewsData);
      }

    } catch (error) {
      console.error('SHOP DETAILS: Error fetching shop data:', error);
      toast.error('Failed to load shop information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBooking = () => {
    if (!merchant) return;
    
    console.log('SHOP DETAILS: Starting booking process');
    
    navigate(`/guest-services/${merchantId}`, { 
      state: { 
        guestInfo, 
        merchant,
        isGuestBooking: true 
      }
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-poppins">Loading shop details...</p>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Shop Not Found</h1>
          <p className="text-gray-600 font-poppins">The booking link may be invalid or expired.</p>
          <Button 
            onClick={() => navigate(-1)}
            className="mt-4 bg-purple-600 hover:bg-purple-700"
          >
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
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-medium font-righteous">Shop Details</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold font-righteous text-purple-800">Booking For</h3>
                <p className="text-sm text-purple-600 font-poppins">Quick booking details</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="font-poppins font-medium">{guestInfo.name}</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
                <Phone className="h-4 w-4 text-purple-500" />
                <span className="font-poppins">{guestInfo.phone}</span>
              </div>
              {guestInfo.email && (
                <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
                  <Mail className="h-4 w-4 text-purple-500" />
                  <span className="font-poppins">{guestInfo.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shop Info */}
        <Card className="shadow-xl border-0 bg-white">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 font-righteous">{merchant.shop_name}</h2>
                <Badge variant="secondary" className="mt-2 font-poppins">
                  {merchant.category}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-poppins">{merchant.address}</span>
              </div>

              {merchant.rating && (
                <div className="flex items-center gap-2">
                  <div className="flex">{renderStars(Math.round(merchant.rating))}</div>
                  <span className="text-sm text-gray-600 font-poppins">
                    {merchant.rating.toFixed(1)} rating
                  </span>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-poppins">
                    {formatTime(merchant.open_time)} - {formatTime(merchant.close_time)}
                  </span>
                </div>
              </div>

              {merchant.description && (
                <p className="text-gray-700 font-poppins">{merchant.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader>
            <CardTitle className="font-righteous text-gray-800">Available Services</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {services.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-poppins">
                No services available at the moment
              </div>
            ) : (
              <div className="space-y-0">
                {services.map((service, index) => (
                  <div key={service.id}>
                    <div className="p-4 hover:bg-purple-50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-semibold font-righteous text-gray-800">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1 font-poppins line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="font-poppins bg-purple-50 text-purple-700 border-purple-200">
                              <Clock className="h-3 w-3 mr-1" />
                              {service.duration} min
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-purple-600">
                            ₹{service.price}
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < services.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews */}
        {reviews.length > 0 && (
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader>
              <CardTitle className="font-righteous text-gray-800">Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold font-righteous">{review.customer_name}</span>
                    <div className="flex">{renderStars(review.rating)}</div>
                  </div>
                  <p className="text-gray-700 text-sm font-poppins">{review.review}</p>
                  <p className="text-xs text-gray-500 mt-1 font-poppins">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl">
        <div className="max-w-lg mx-auto p-4">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-lg py-6 font-poppins font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
            size="lg"
            onClick={handleStartBooking}
            disabled={services.length === 0}
          >
            {services.length === 0 ? (
              'No Services Available'
            ) : (
              <div className="flex items-center justify-between w-full">
                <span>Start Booking Process</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuestShopDetailsPage;
