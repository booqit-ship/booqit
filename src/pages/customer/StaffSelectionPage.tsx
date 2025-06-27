
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Staff } from '@/types';
import { toast } from 'sonner';

const StaffSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration } = location.state;

  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('any');
  const [selectedStaffDetails, setSelectedStaffDetails] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        if (!merchantId) return;

        console.log('Fetching staff for merchant:', merchantId);
        
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);

        if (error) {
          console.error('Error fetching staff:', error);
          throw error;
        }
        
        console.log('Fetched staff data:', data);
        setStaff(data || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error('Could not load staff');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [merchantId]);

  const handleStaffChange = (value: string) => {
    setSelectedStaff(value);
    if (value === 'any') {
      setSelectedStaffDetails(null);
    } else {
      const staffMember = staff.find(s => s.id === value);
      setSelectedStaffDetails(staffMember || null);
    }
  };

  const handleContinue = () => {
    navigate(`/booking/${merchantId}/datetime`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff: selectedStaff === 'any' ? null : selectedStaff,
        selectedStaffDetails
      }
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-white min-h-screen">
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-0 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">Choose Stylist</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Select Your Preferred Stylist</h2>
          <p className="text-gray-500 text-sm">Choose any available stylist or let us assign one for you</p>
        </div>

        <RadioGroup value={selectedStaff} onValueChange={handleStaffChange} className="space-y-3">
          {/* Any Stylist Option */}
          <Card className={`border transition-all overflow-hidden ${selectedStaff === 'any' ? 'border-booqit-primary' : 'border-gray-200'}`}>
            <CardContent className="p-0">
              <label htmlFor="any" className="flex items-center p-4 cursor-pointer">
                <RadioGroupItem value="any" id="any" className="mr-4" />
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="font-semibold">Any Available Stylist</div>
                  <div className="text-gray-500 text-sm">We'll assign the next available stylist for you</div>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Individual Staff Options */}
          {staff.map((stylist) => (
            <Card 
              key={stylist.id}
              className={`border transition-all overflow-hidden ${selectedStaff === stylist.id ? 'border-booqit-primary' : 'border-gray-200'}`}
            >
              <CardContent className="p-0">
                <label htmlFor={stylist.id} className="flex items-center p-4 cursor-pointer">
                  <RadioGroupItem value={stylist.id} id={stylist.id} className="mr-4" />
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarFallback className="bg-gray-200 text-gray-700">
                      {stylist.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{stylist.name}</div>
                    <div className="text-gray-500 text-sm">Hair Specialist</div>
                  </div>
                </label>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>

        {staff.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg mt-4">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No stylists available</p>
            <p className="text-gray-400 text-sm">You can still proceed with your booking</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default StaffSelectionPage;
