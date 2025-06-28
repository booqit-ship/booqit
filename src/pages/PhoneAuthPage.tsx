
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Phone, MessageSquare, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendOTP, verifyOTP, checkPhoneExists, authenticateWithCustomJWT } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmationResult } from 'firebase/auth';
import { toast } from 'sonner';

type Step = 'phone' | 'otp' | 'name';

const PhoneAuthPage: React.FC = () => {
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [userCredential, setUserCredential] = useState<any>(null);
  
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    
    console.log('📞 Sending OTP to:', phoneNumber);
    const result = await sendOTP(phoneNumber);
    if (result) {
      setConfirmationResult(result);
      setStep('otp');
      toast.success('OTP sent successfully!');
    } else {
      toast.error('Failed to send OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!confirmationResult || !otpCode || otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    const result = await verifyOTP(confirmationResult, otpCode);
    if (result) {
      setUserCredential(result);
      
      // Directly attempt authentication with minimal user data
      // The edge function will determine if user exists and handle accordingly
      await handleAuthentication(result, '');
    } else {
      toast.error('Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleAuthentication = async (credential: any, userName: string = '') => {
    try {
      setLoading(true);
      console.log('🔐 Starting authentication process...');
      
      const idToken = await credential.user.getIdToken();
      const authResult = await authenticateWithCustomJWT(idToken, {
        name: userName || 'Customer',
        phone: phoneNumber,
        email: credential.user.email || ''
      });
      
      if (authResult.success) {
        console.log('✅ Authentication successful');
        
        // Set authentication state using the setAuth method
        setAuth(true, 'customer', authResult.user.id);
        
        if (authResult.isExistingUser) {
          console.log('✅ Existing user logged in');
          toast.success('Welcome back!');
          navigate('/home');
        } else {
          console.log('✅ New user, requesting name');
          if (!userName) {
            setStep('name');
          } else {
            toast.success('Account created successfully!');
            navigate('/home');
          }
        }
      } else {
        console.error('❌ Authentication failed');
        toast.error('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      toast.error('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!name.trim() || !userCredential) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    await handleAuthentication(userCredential, name.trim());
  };

  const renderPhoneStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Phone className="h-12 w-12 text-booqit-primary mx-auto mb-4" />
        <h2 className="text-2xl font-righteous mb-2">Enter Your Phone Number</h2>
        <p className="text-gray-600 font-poppins">We'll send you a verification code</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+91 9876543210"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="text-center text-lg"
        />
      </div>

      <Button 
        onClick={handleSendOTP}
        disabled={!phoneNumber || phoneNumber.length < 10 || loading}
        className="w-full"
      >
        {loading ? 'Sending...' : 'Send OTP'}
      </Button>
    </div>
  );

  const renderOTPStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <MessageSquare className="h-12 w-12 text-booqit-primary mx-auto mb-4" />
        <h2 className="text-2xl font-righteous mb-2">Enter Verification Code</h2>
        <p className="text-gray-600 font-poppins">
          We sent a 6-digit code to {phoneNumber}
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="otp">Verification Code</Label>
        <Input
          id="otp"
          type="text"
          placeholder="123456"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="text-center text-2xl tracking-widest"
          maxLength={6}
        />
      </div>

      <Button 
        onClick={handleVerifyOTP}
        disabled={otpCode.length !== 6 || loading}
        className="w-full"
      >
        {loading ? 'Verifying...' : 'Verify Code'}
      </Button>

      <Button 
        onClick={() => setStep('phone')}
        variant="ghost"
        className="w-full"
      >
        Change Phone Number
      </Button>
    </div>
  );

  const renderNameStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <User className="h-12 w-12 text-booqit-primary mx-auto mb-4" />
        <h2 className="text-2xl font-righteous mb-2">What's Your Name?</h2>
        <p className="text-gray-600 font-poppins">This will be shown on your bookings</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-center"
        />
      </div>

      <Button 
        onClick={handleComplete}
        disabled={!name.trim() || loading}
        className="w-full"
      >
        {loading ? 'Setting up...' : 'Complete Setup'}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ duration: 0.5 }} 
        className="w-full max-w-md space-y-6"
      >
        {/* Header with back button */}
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => navigate('/')}
            variant="ghost" 
            size="sm"
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-righteous text-black">booqit</h1>
        </div>

        {/* Auth Card */}
        <Card>
          <CardContent className="p-6">
            {step === 'phone' && renderPhoneStep()}
            {step === 'otp' && renderOTPStep()}
            {step === 'name' && renderNameStep()}
          </CardContent>
        </Card>

        {/* Hidden reCAPTCHA container */}
        <div id="recaptcha-container"></div>
      </motion.div>
    </div>
  );
};

export default PhoneAuthPage;
