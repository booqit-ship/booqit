
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Clock, Package } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
}

interface ServiceSelection {
  id: string;
  name: string;
  price: number;
  duration: number;
}

const StaffSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<ServiceSelection[]>([]);

  useEffect(() => {
    // Get selected services from previous page
    const services = location.state?.selectedServices;
    if (!services || services.length === 0) {
      toast.error('No services selected');
      navigate(`/service-selection/${merchantId}`);
      return;
    }
    setSelectedServices(services);
  }, [location.state, merchantId, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!merchantId) return;

      try {
        // Fetch merchant info
        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', merchantId)
          .single();

        if (merchantError) throw merchantError;
        setMerchantData(merchant);

        // Fetch staff
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId)
          .order('name');

        if (staffError) throw staffError;
        setStaff(staffData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load staff');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [merchantId]);

  const handleStaffSelect = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
  };

  const handleContinue = () => {
    if (!selectedStaff) {
      toast.error('Please select a stylist');
      return;
    }

    if (!merchantData) {
      toast.error('Merchant data not loaded');
      return;
    }

    // Navigate to date/time selection with all the booking data
    navigate(`/date-time-selection/${merchantId}`, {
      state: {
        selectedServices,
        selectedStaff,
        merchantData
      }
    });
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, service) => sum + service.price, 0);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((sum, service) => sum + service.duration, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-light mb-2">Select Stylist</h1>
        <p className="text-gray-600">{merchantData?.shop_name}</p>
      </div>

      {/* Selected Services Summary */}
      <Card className="mb-6 border-booqit-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selected Services ({selectedServices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {selectedServices.map((service) => (
              <div key={service.id} className="flex justify-between items-center text-sm">
                <span>{service.name}</span>
                <span>₹{service.price}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center font-semibold">
              <div>
                <p>Total: ₹{getTotalPrice()}</p>
                <p className="text-sm text-gray-600 font-normal">{getTotalDuration()} minutes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 mb-6">
        {staff.map((staffMember) => (
          <Card 
            key={staffMember.id} 
            className={`cursor-pointer transition-all ${
              selectedStaff?.id === staffMember.id 
                ? 'border-booqit-primary bg-booqit-primary/5' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleStaffSelect(staffMember)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="" alt={staffMember.name} />
                  <AvatarFallback className="bg-booqit-primary/10 text-booqit-primary">
                    {staffMember.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="font-semibold">{staffMember.name}</h3>
                  <p className="text-gray-600 text-sm">Professional Stylist</p>
                </div>
                
                {selectedStaff?.id === staffMember.id && (
                  <div className="w-6 h-6 bg-booqit-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {staff.length === 0 && (
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No stylists available</p>
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={handleContinue}
          disabled={!selectedStaff}
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
          size="lg"
        >
          Continue to Date & Time
        </Button>
        
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default StaffSelectionPage;
