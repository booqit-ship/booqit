
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Users, User, Check } from 'lucide-react';

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
    console.log('GUEST STAFF SELECTION: Page loaded with state:', {
      guestInfo: !!guestInfo,
      merchant: !!merchant,
      selectedServices: selectedServices?.length || 0,
      totalPrice,
      totalDuration
    });

    if (!guestInfo || !selectedServices || selectedServices.length === 0) {
      console.log('GUEST STAFF SELECTION: Missing required data, redirecting...');
      navigate(`/book/${merchantId}`);
      return;
    }
    
    fetchStaff();
  }, [merchantId, guestInfo, selectedServices]);

  const fetchStaff = async () => {
    if (!merchantId) return;

    setIsLoading(true);
    try {
      console.log('GUEST STAFF SELECTION: Fetching staff for merchant:', merchantId);
      
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('name', { ascending: true });

      if (staffError) throw staffError;
      
      console.log('GUEST STAFF SELECTION: Staff loaded:', staffData?.length || 0);
      setStaff(staffData || []);
    } catch (error) {
      console.error('GUEST STAFF SELECTION: Error fetching staff:', error);
      toast.error('Failed to load staff information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffSelect = (staffMember: Staff | null) => {
    console.log('GUEST STAFF SELECTION: Staff selected:', staffMember?.name || 'Any Available');
    
    if (staffMember === null) {
      // "Any Available Stylist" selected
      setSelectedStaff('');
      setSelectedStaffDetails(null);
    } else if (selectedStaff === staffMember.id) {
      // Deselect current staff
      setSelectedStaff('');
      setSelectedStaffDetails(null);
    } else {
      // Select new staff
      setSelectedStaff(staffMember.id);
      setSelectedStaffDetails(staffMember);
    }
  };

  const handleContinue = () => {
    console.log('GUEST STAFF SELECTION: Continuing to datetime selection with:', {
      selectedStaff: selectedStaff || 'Any available stylist',
      staffDetails: selectedStaffDetails?.name || 'Any available stylist'
    });

    // Navigate to datetime selection page
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-booqit-primary"></div>
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
          <h1 className="text-xl font-medium font-righteous">Choose Stylist</h1>
        </div>
      </div>

      <div className="p-4">
        {/* Selection Summary */}
        <Card className="mb-6 border-booqit-primary/20">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 font-righteous">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-poppins">Services:</span>
                <span>{selectedServices?.length || 0} selected</span>
              </div>
              <div className="flex justify-between">
                <span className="font-poppins">Total Duration:</span>
                <span>{totalDuration} minutes</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span className="font-poppins">Total Price:</span>
                <span>₹{totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 font-righteous">Select Your Preferred Stylist</h3>
            <p className="text-gray-600 text-sm font-poppins mb-4">
              Choose a specific stylist or let us assign any available stylist
            </p>
          </div>

          <div className="space-y-3">
            {/* Any Available Stylist Option */}
            <Card 
              className={`cursor-pointer transition-all duration-200 ${
                !selectedStaff 
                  ? 'border-booqit-primary bg-booqit-primary/5 shadow-md' 
                  : 'hover:shadow-md border-l-4 border-l-gray-200 hover:border-l-booqit-primary'
              }`}
              onClick={() => handleStaffSelect(null)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-booqit-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-booqit-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold font-righteous">Any Available Stylist</h4>
                      <p className="text-sm text-gray-600 font-poppins">We'll assign the best available stylist</p>
                    </div>
                  </div>
                  {!selectedStaff && (
                    <Check className="h-5 w-5 text-booqit-primary" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Individual Staff Members */}
            {staff.map((staffMember) => (
              <Card 
                key={staffMember.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedStaff === staffMember.id 
                    ? 'border-booqit-primary bg-booqit-primary/5 shadow-md' 
                    : 'hover:shadow-md border-l-4 border-l-gray-200 hover:border-l-booqit-primary'
                }`}
                onClick={() => handleStaffSelect(staffMember)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold font-righteous">{staffMember.name}</h4>
                        <p className="text-sm text-gray-600 font-poppins">Professional Stylist</p>
                      </div>
                    </div>
                    {selectedStaff === staffMember.id && (
                      <Check className="h-5 w-5 text-booqit-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6 font-poppins"
          size="lg"
          onClick={handleContinue}
        >
          Continue to Date & Time
        </Button>
      </div>
    </div>
  );
};

export default GuestStaffSelectionPage;
