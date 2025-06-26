
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Store, Calendar, History } from 'lucide-react';

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
  const { merchantId } = useParams();
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

  const merchantFromState = location.state?.merchant;
  const fromCustomUrl = location.state?.fromCustomUrl;
  const shopSlug = location.state?.shopSlug;

  useEffect(() => {
    console.log('QUICK BOOQIT: Page loaded with params:', { merchantId });
    console.log('QUICK BOOQIT: Location state:', location.state);
    console.log('QUICK BOOQIT: From custom URL:', fromCustomUrl);
    console.log('QUICK BOOQIT: Shop slug:', shopSlug);
    
    if (merchantFromState) {
      console.log('QUICK BOOQIT: Using merchant from custom URL resolution');
      setMerchant(merchantFromState);
      setIsLoading(false);
    } else if (merchantId) {
      fetchMerchantData();
    } else {
      console.error('QUICK BOOQIT: No merchant ID or merchant data available');
      toast({
        title: "Error",
        description: "No shop information available",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [merchantId, merchantFromState, navigate]);

  const fetchMerchantData = async () => {
    if (!merchantId) return;
    
    setIsLoading(true);
    try {
      console.log('QUICK BOOQIT: Fetching merchant data for:', merchantId);
      
      const { data: merchantData, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (error) {
        console.error('QUICK BOOQIT: Error fetching merchant:', error);
        if (error.code === 'PGRST116') {
          toast({
            title: "Shop Not Found",
            description: "The requested shop could not be found",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        throw error;
      }
      
      console.log('QUICK BOOQIT: Merchant data loaded:', merchantData.shop_name);
      setMerchant(merchantData);
    } catch (error) {
      console.error('QUICK BOOQIT: Error fetching merchant data:', error);
      toast({
        title: "Error",
        description: "Failed to load shop information",
        variant: "destructive",
      });
      navigate('/');
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

    console.log('QUICK BOOQIT: Submitting info:', guestInfo);
    
    sessionStorage.setItem('guestBookingInfo', JSON.stringify(guestInfo));
    
    navigate(`/guest-shop/${merchant.id}`, { 
      state: { 
        guestInfo, 
        merchant,
        isGuestBooking: true,
        shopSlug: shopSlug
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGuestInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCancelBooking = () => {
    navigate('/guest-cancel-booking');
  };

  const handleViewHistory = () => {
    navigate('/guest-booking-history');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-poppins">Loading shop information...</p>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Shop Not Found</h1>
          <p className="text-gray-600 font-poppins mb-4">The booking link may be invalid or expired.</p>
          <Button onClick={() => navigate('/')} className="bg-purple-600 hover:bg-purple-700">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white font-righteous mb-2">Quick Booqit</h1>
            <p className="text-purple-100 font-poppins">{merchant.shop_name}</p>
          </div>
          
          {/* Shop info card */}
          <Card className="mt-6 bg-white/10 border-white/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {merchant.image_url ? (
                  <img
                    src={merchant.image_url}
                    alt={merchant.shop_name}
                    className="w-16 h-16 rounded-xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center shadow-lg">
                    <Store className="h-8 w-8 text-purple-600" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="font-semibold text-lg font-righteous text-white">{merchant.shop_name}</h2>
                  <p className="text-sm text-purple-100 font-poppins">{merchant.category}</p>
                  <p className="text-xs text-purple-200 mt-1 font-poppins">{merchant.address}</p>
                  {merchant.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-yellow-300">⭐</span>
                      <span className="text-sm font-poppins text-purple-100">{merchant.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <Card className="shadow-xl border-0 bg-white mb-6">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-righteous text-2xl text-gray-800">Your Details</CardTitle>
            <p className="text-gray-600 font-poppins text-sm">Let's get you booked quickly</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 font-poppins">
                  Your Name *
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={guestInfo.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="h-12 font-poppins border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 font-poppins">
                  Phone Number *
                </Label>
                <Input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={guestInfo.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="h-12 font-poppins border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 font-poppins">
                  Email Address (optional)
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={guestInfo.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="h-12 font-poppins border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 font-poppins font-medium text-base shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                Continue to Services
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Booking Management Options */}
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-righteous text-xl text-gray-800">Manage Existing Bookings</CardTitle>
            <p className="text-gray-600 font-poppins text-sm">Cancel bookings or view your booking history</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={handleCancelBooking}
                variant="outline"
                className="h-12 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-poppins font-medium transition-all duration-200"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Cancel Booking
              </Button>
              
              <Button
                onClick={handleViewHistory}
                variant="outline"
                className="h-12 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 font-poppins font-medium transition-all duration-200"
              >
                <History className="w-5 h-5 mr-2" />
                View History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestInfoPage;
