
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Mail } from 'lucide-react';

const GuestInfoPage: React.FC = () => {
  const { merchantId, shopName } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setGuestInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContinue = () => {
    // Validate required fields
    if (!guestInfo.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }

    if (!guestInfo.phone.trim()) {
      toast({
        title: "Phone number required", 
        description: "Please enter your phone number to continue",
        variant: "destructive",
      });
      return;
    }

    // Store guest info in sessionStorage for the booking flow
    sessionStorage.setItem('guestBookingInfo', JSON.stringify(guestInfo));
    
    // Navigate to merchant detail page with guest booking flag
    navigate(`/guest-booking/${merchantId}/${shopName}`, { 
      state: { guestInfo, isGuestBooking: true }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white p-6">
      <motion.div 
        className="max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-booqit-dark mb-2">Quick Booking</h1>
          <p className="text-booqit-dark/70">Enter your details to book an appointment</p>
        </div>

        <Card className="shadow-lg border-none">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Your Information</CardTitle>
            <CardDescription>
              We'll need these details to confirm your booking
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={guestInfo.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={guestInfo.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={guestInfo.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="h-12"
              />
            </div>

            <Button 
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full h-12 bg-booqit-primary hover:bg-booqit-primary/90 text-lg"
            >
              {isLoading ? "Please wait..." : "Continue Booking"}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Your information is secure and will only be used for booking purposes
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default GuestInfoPage;
