
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, Phone, Mail } from 'lucide-react';

const GuestInfoPage: React.FC = () => {
  const { merchantId, shopName } = useParams();
  const navigate = useNavigate();
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!guestInfo.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    // Store guest info in session storage as backup
    sessionStorage.setItem('guestBookingInfo', JSON.stringify(guestInfo));
    
    // Navigate to shop details page first
    navigate(`/guest-shop/${merchantId}`, { 
      state: { 
        guestInfo
      }
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
          <h1 className="text-3xl font-bold text-booqit-dark mb-2 font-righteous">Quick Booking</h1>
          <p className="text-booqit-dark/70 font-poppins">Enter your details to book an appointment</p>
        </div>

        <Card className="shadow-lg border-none">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-righteous">Your Information</CardTitle>
            <CardDescription className="font-poppins">
              We'll need these details to confirm your booking
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2 font-poppins">
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
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2 font-poppins">
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
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2 font-poppins">
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
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full h-12 bg-booqit-primary hover:bg-booqit-primary/90 text-lg font-poppins"
            >
              {isLoading ? "Please wait..." : "Continue Booking"}
            </Button>

            <p className="text-xs text-gray-500 text-center font-poppins">
              Your information is secure and will only be used for booking purposes
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default GuestInfoPage;
