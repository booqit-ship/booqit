import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

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
        isGuestBooking: true 
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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Shop Not Found</h1>
          <p className="text-gray-600 font-poppins">The booking link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto max-w-md">
        {/* Header */}
        <div className="bg-booqit-primary text-white p-4 rounded-t-md flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium font-righteous">Enter Your Details</h1>
        </div>

        <Card className="shadow-md rounded-md">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Your Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={guestInfo.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="mt-1 block w-full"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={guestInfo.phone}
                  onChange={handleChange}
                  placeholder="123-456-7890"
                  className="mt-1 block w-full"
                />
              </div>
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address (optional)
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={guestInfo.email}
                  onChange={handleChange}
                  placeholder="john.doe@example.com"
                  className="mt-1 block w-full"
                />
              </div>
              <div>
                <Button type="submit" className="w-full bg-booqit-primary text-white">
                  Continue to Shop Details
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestInfoPage;
