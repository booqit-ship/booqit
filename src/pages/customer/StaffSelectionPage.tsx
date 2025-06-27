
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Users, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [selectedStaff, setSelectedStaff] = useState<string>('');
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

  const handleStaffSelect = (staffMember: Staff | null) => {
    console.log('STAFF SELECTION: Staff selected:', staffMember?.name || 'Any Available');
    
    if (staffMember === null) {
      setSelectedStaff('');
      setSelectedStaffDetails(null);
    } else if (selectedStaff === staffMember.id) {
      setSelectedStaff('');
      setSelectedStaffDetails(null);
    } else {
      setSelectedStaff(staffMember.id);
      setSelectedStaffDetails(staffMember);
    }
  };

  const handleContinue = () => {
    navigate(`/booking/${merchantId}/datetime`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff: selectedStaff || null,
        selectedStaffDetails
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
            <h1 className="text-xl font-medium font-righteous">Choose Stylist</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Selection Summary */}
        <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3 font-righteous text-purple-800">Booking Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between bg-white p-3 rounded-lg shadow-sm">
                <span className="font-poppins text-gray-600">Services:</span>
                <span className="font-medium">{selectedServices?.length || 0} selected</span>
              </div>
              <div className="flex justify-between bg-white p-3 rounded-lg shadow-sm">
                <span className="font-poppins text-gray-600">Total Duration:</span>
                <span className="font-medium">{totalDuration} minutes</span>
              </div>
              <div className="flex justify-between font-semibold text-base bg-white p-3 rounded-lg shadow-sm border-t-2 border-purple-200">
                <span className="font-poppins text-purple-800">Total Price:</span>
                <span className="text-purple-600 text-lg">₹{totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-2 font-righteous text-gray-800">Select Your Preferred Stylist</h3>
            <p className="text-gray-600 text-sm font-poppins mb-4">
              Choose a specific stylist or let us assign any available stylist
            </p>
          </div>

          <div className="space-y-4">
            {/* Any Available Stylist Option */}
            <Card 
              className={`cursor-pointer transition-all duration-300 ${
                !selectedStaff 
                  ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg ring-2 ring-purple-200' 
                  : 'hover:shadow-lg border-gray-200 hover:border-purple-300 bg-white'
              }`}
              onClick={() => handleStaffSelect(null)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center shadow-lg">
                      <Users className="h-7 w-7 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold font-righteous text-lg text-gray-800">Any Available Stylist</h4>
                      <p className="text-sm text-gray-600 font-poppins">We'll assign the best available stylist</p>
                    </div>
                  </div>
                  {!selectedStaff && (
                    <Check className="h-6 w-6 text-purple-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Individual Staff Members */}
            {staff.map((staffMember) => (
              <Card 
                key={staffMember.id}
                className={`cursor-pointer transition-all duration-300 ${
                  selectedStaff === staffMember.id 
                    ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg ring-2 ring-purple-200' 
                    : 'hover:shadow-lg border-gray-200 hover:border-purple-300 bg-white'
                }`}
                onClick={() => handleStaffSelect(staffMember)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 shadow-lg">
                        <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 text-lg font-semibold">
                          {staffMember.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold font-righteous text-lg text-gray-800">{staffMember.name}</h4>
                        <p className="text-sm text-gray-600 font-poppins">Professional Stylist</p>
                      </div>
                    </div>
                    {selectedStaff === staffMember.id && (
                      <Check className="h-6 w-6 text-purple-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {staff.length === 0 && (
            <Card className="shadow-lg">
              <CardContent className="p-8 text-center">
                <User className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 font-poppins mb-2">No stylists available</p>
                <p className="text-gray-400 text-sm font-poppins">You can still proceed with your booking</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl">
        <div className="max-w-lg mx-auto p-4">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-lg py-6 font-poppins font-medium shadow-lg"
            size="lg"
            onClick={handleContinue}
          >
            <div className="flex items-center justify-between w-full">
              <span>Continue to Date & Time</span>
              <ChevronRight className="h-5 w-5" />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StaffSelectionPage;
