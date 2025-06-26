
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Phone, Mail, ArrowRight, X, History } from 'lucide-react';
import { toast } from 'sonner';

const GuestInfoPage: React.FC = () => {
  const { merchantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { merchant, selectedServices, totalPrice, totalDuration } = location.state || {};

  const [guestInfo, setGuestInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!guestInfo.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!guestInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(guestInfo.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    if (guestInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    if (!selectedServices || selectedServices.length === 0) {
      toast.error('Please select services first');
      navigate(`/book/${merchantId}`);
      return;
    }

    navigate(`/guest-staff/${merchantId}`, { 
      state: { 
        guestInfo, 
        merchant, 
        selectedServices, 
        totalPrice, 
        totalDuration 
      } 
    });
  };

  const handleCancelBooking = () => {
    navigate('/guest-cancel-booking');
  };

  const handleViewHistory = () => {
    navigate('/guest-booking-history');
  };

  if (!merchant || !selectedServices) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 font-righteous">Invalid Request</h1>
          <p className="text-gray-600 font-poppins">Please start your booking from the beginning.</p>
          <Button 
            onClick={() => navigate(`/book/${merchantId}`)}
            className="mt-4 bg-purple-600 hover:bg-purple-700"
          >
            Start Booking
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
            <h1 className="text-xl font-medium font-righteous">Your Information</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Guest Booking Management Options */}
        <Card className="mb-6 border-gray-200 bg-white shadow-lg">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4 font-righteous text-gray-800">Already have a booking?</h3>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                onClick={handleCancelBooking}
                variant="outline" 
                className="w-full h-12 border-red-300 text-red-600 hover:bg-red-50 font-poppins font-medium"
              >
                <X className="h-5 w-5 mr-2" />
                Cancel Existing Booking
              </Button>
              
              <Button 
                onClick={handleViewHistory}
                variant="outline" 
                className="w-full h-12 border-blue-300 text-blue-600 hover:bg-blue-50 font-poppins font-medium"
              >
                <History className="h-5 w-5 mr-2" />
                View Booking History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Booking Summary */}
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

        {/* Guest Information Form */}
        <Card className="shadow-xl border-0 bg-white">
          <CardContent className="p-6">
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold mb-2 font-righteous text-gray-800">Contact Information</h3>
                <p className="text-gray-600 text-sm font-poppins">
                  Please provide your details for the booking confirmation
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 font-poppins">
                    Full Name *
                  </Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      value={guestInfo.name}
                      onChange={(e) => {
                        setGuestInfo(prev => ({ ...prev, name: e.target.value }));
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className={`pl-10 h-12 font-poppins ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 font-poppins">
                    Phone Number *
                  </Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={guestInfo.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setGuestInfo(prev => ({ ...prev, phone: value }));
                        if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      className={`pl-10 h-12 font-poppins ${errors.phone ? 'border-red-500' : ''}`}
                      placeholder="Enter your phone number"
                      maxLength={10}
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 font-poppins">
                    Email Address (Optional)
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={guestInfo.email}
                      onChange={(e) => {
                        setGuestInfo(prev => ({ ...prev, email: e.target.value }));
                        if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                      }}
                      className={`pl-10 h-12 font-poppins ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="Enter your email address"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <span>Continue to Staff Selection</span>
              <ArrowRight className="h-5 w-5" />
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuestInfoPage;
