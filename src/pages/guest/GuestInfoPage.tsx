
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Store } from 'lucide-react';

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

const GuestInfoPage: React.FC = () => {
  const { merchantId, shopName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // Get merchant from location state if coming from custom URL
  const merchantFromState = location.state?.merchant;
  const fromCustomUrl = location.state?.fromCustomUrl;
  const shopSlug = location.state?.shopSlug;

  useEffect(() => {
    console.log('GUEST INFO: Page loaded with params:', { merchantId, shopName });
    console.log('GUEST INFO: Location state:', location.state);
    
    if (merchantFromState) {
      console.log('GUEST INFO: Using merchant from custom URL resolution');
      setMerchant(merchantFromState);
      setIsLoading(false);
    } else if (merchantId) {
      fetchMerchantData();
    } else {
      console.error('GUEST INFO: No merchant ID or merchant data available');
      setIsLoading(false);
    }
  }, [merchantId, merchantFromState]);

  const fetchMerchantData = async () => {
    if (!merchantId) return;
    
    setIsLoading(true);
    try {
      console.log('GUEST INFO: Fetching merchant data for:', merchantId);
      
      const { data: merchantData, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (error) {
        console.error('GUEST INFO: Error fetching merchant:', error);
        throw error;
      }
      
      console.log('GUEST INFO: Merchant data loaded:', merchantData.shop_name);
      setMerchant(merchantData);
    } catch (error) {
      console.error('GUEST INFO: Error fetching merchant data:', error);
      toast({
        title: "Error",
        description: "Failed to load shop information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestInfo.name.trim() || !guestInfo.phone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name and phone number",
        variant: "destructive",
      });
      return;
    }

    if (!merchant) {
      toast({
        title: "Error",
        description: "Shop information not available",
        variant: "destructive",
      });
      return;
    }

    console.log('GUEST INFO: Submitting guest info:', guestInfo);
    
    // Store guest info in session storage
    sessionStorage.setItem('guestBookingInfo', JSON.stringify(guestInfo));
    
    // Navigate to shop details page
    navigate(`/guest-shop/${merchant.id}`, { 
      state: { 
        guestInfo, 
        merchant,
        isGuestBooking: true,
        shopSlug: shopSlug
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGuestInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-booqit-primary mx-auto mb-4"></div>
          <p className="text-gray-600 font-poppins">Loading shop information...</p>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Shop Not Found</h1>
          <p className="text-gray-600 font-poppins mb-4">The booking link may be invalid or expired.</p>
          <Button onClick={() => navigate('/')} className="bg-booqit-primary hover:bg-booqit-primary/90">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with shop info */}
      <div className="bg-white border-b">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-gray-600 hover:bg-gray-100"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-booqit-primary font-righteous">Book Appointment</h1>
              <p className="text-sm text-gray-600 font-poppins">{merchant.shop_name}</p>
            </div>
          </div>
          
          {/* Shop info card */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {merchant.image_url ? (
                  <img
                    src={merchant.image_url}
                    alt={merchant.shop_name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-booqit-primary/10 rounded-lg flex items-center justify-center">
                    <Store className="h-8 w-8 text-booqit-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="font-semibold text-lg font-righteous">{merchant.shop_name}</h2>
                  <p className="text-sm text-gray-600 font-poppins">{merchant.category}</p>
                  <p className="text-xs text-gray-500 mt-1 font-poppins">{merchant.address}</p>
                  {merchant.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="text-sm font-poppins">{merchant.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-righteous">Enter Your Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-gray-700 font-poppins">
                  Your Name *
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={guestInfo.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="mt-1 font-poppins"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 font-poppins">
                  Phone Number *
                </Label>
                <Input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={guestInfo.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="mt-1 font-poppins"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 font-poppins">
                  Email Address (optional)
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={guestInfo.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="mt-1 font-poppins"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
              >
                Continue to Services
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestInfoPage;
