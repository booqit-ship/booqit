
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, User, Check, ChevronRight } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
}

const GuestStaffSelectionPage: React.FC = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    guestInfo, 
    merchant, 
    selectedServices, 
    totalPrice, 
    totalDuration
  } = location.state || {};

  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedStaffDetails, setSelectedStaffDetails] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('STAFF SELECTION: Page loaded with state:', {
      guestInfo: !!guestInfo,
      merchant: !!merchant,
      selectedServices: selectedServices?.length || 0,
      totalPrice,
      totalDuration
    });

    if (!guestInfo || !selectedServices || selectedServices.length === 0) {
      console.log('STAFF SELECTION: Missing required data, redirecting...');
      navigate(`/book/${merchantId}`);
      return;
    }
    
    fetchStaff();
  }, [merchantId, guestInfo, selectedServices]);

  const fetchStaff = async () => {
    if (!merchantId) return;

    setIsLoading(true);
    try {
      console.log('STAFF SELECTION: Fetching staff for merchant:', merchantId);
      
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('name', { ascending: true });

      if (staffError) throw staffError;
      
      console.log('STAFF SELECTION: Staff loaded:', staffData?.length || 0);
      setStaff(staffData || []);
    } catch (error) {
      console.error('STAFF SELECTION: Error fetching staff:', error);
      toast.error('Failed to load staff information');
    } finally {
      setIsLoading(false);
    }
  };

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
    console.log('STAFF SELECTION: Continuing to datetime selection with:', {
      selectedStaff: selectedStaff || 'Any available stylist',
      staffDetails: selectedStaffDetails?.name || 'Any available stylist'
    });

    navigate(`/guest-datetime/${merchantId}`, { 
      state: { 
        guestInfo, 
        merchant, 
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff: selectedStaff || null,
        selectedStaffDetails: selectedStaffDetails || null
      }
    });
  };

  if (isLoading) {
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
              className={`cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
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
                className={`cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                  selectedStaff === staffMember.id 
                    ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-purple-100 shadow-lg ring-2 ring-purple-200' 
                    : 'hover:shadow-lg border-gray-200 hover:border-purple-300 bg-white'
                }`}
                onClick={() => handleStaffSelect(staffMember)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-lg">
                        <User className="h-7 w-7 text-gray-600" />
                      </div>
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
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl">
        <div className="max-w-lg mx-auto p-4">
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-lg py-6 font-poppins font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
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

export default GuestStaffSelectionPage;
