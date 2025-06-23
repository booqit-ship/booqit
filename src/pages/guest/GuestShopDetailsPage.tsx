
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Clock, MapPin, Star, Users, Phone, Mail } from 'lucide-react';

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
    if (!guestInfo.name || !guestInfo.phone) {
      navigate(`/book/${merchantId}`);
      return;
    }
    
    fetchShopData();
  }, [merchantId, guestInfo]);

  const fetchShopData = async () => {
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
        .eq('merchant_id', merchantId)
        .order('name', { ascending: true });

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          review,
          customer_name,
          created_at
        `)
        .eq('booking_id', merchantId) // This might need to be adjusted based on your schema
        .order('created_at', { ascending: false })
        .limit(10);

      if (!reviewsError && reviewsData) {
        setReviews(reviewsData);
      }

    } catch (error) {
      console.error('Error fetching shop data:', error);
      toast.error('Failed to load shop information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBooking = () => {
    if (!merchant) return;
    
    // Navigate to service selection page
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
          <h1 className="text-xl font-medium font-righteous">Shop Details</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Guest Info Card */}
        <Card className="border-booqit-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-booqit-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-booqit-primary" />
              </div>
              <div>
                <h3 className="font-semibold font-righteous">Booking For</h3>
                <p className="text-sm text-gray-600 font-poppins">Guest booking details</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="font-poppins">{guestInfo.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="font-poppins">{guestInfo.phone}</span>
              </div>
              {guestInfo.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="font-poppins">{guestInfo.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shop Info */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-booqit-dark font-righteous">{merchant.shop_name}</h2>
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
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous">Available Services</CardTitle>
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
                    <div className="p-4 flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="font-semibold font-righteous">{service.name}</h4>
                        {service.description && (
                          <p className="text-sm text-gray-600 mt-1 font-poppins">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="font-poppins">
                            <Clock className="h-3 w-3 mr-1" />
                            {service.duration} min
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-booqit-primary">
                          ₹{service.price}
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
          <Card>
            <CardHeader>
              <CardTitle className="font-righteous">Customer Reviews</CardTitle>
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handleStartBooking}
          disabled={services.length === 0}
        >
          {services.length === 0 ? 'No Services Available' : 'Start Booking Process'}
        </Button>
      </div>
    </div>
  );
};

export default GuestShopDetailsPage;
