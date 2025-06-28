
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ConfirmationResult } from 'firebase/auth';
import { sendPhoneVerification, verifyPhoneCode, getFirebaseCustomToken } from '@/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { PermanentSession } from '@/utils/permanentSession';
import PhoneInput from '@/components/auth/PhoneInput';
import OTPVerification from '@/components/auth/OTPVerification';
import UserDetailsForm from '@/components/auth/UserDetailsForm';
import { toast } from 'sonner';

type AuthStep = 'phone' | 'otp' | 'details';

const PhoneAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSendOTP = async (phone: string) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('📱 Sending OTP to:', phone);
      const result = await sendPhoneVerification(phone);
      setConfirmationResult(result);
      setPhoneNumber(phone);
      setStep('otp');
      toast.success('Verification code sent to your phone');
    } catch (error: any) {
      console.error('❌ Error sending OTP:', error);
      setError(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    if (!confirmationResult) return;
    
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Verifying OTP...');
      await verifyPhoneCode(confirmationResult, code);
      setStep('details');
      toast.success('Phone number verified successfully');
    } catch (error: any) {
      console.error('❌ Error verifying OTP:', error);
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!phoneNumber) return;
    
    setLoading(true);
    setError('');

    try {
      const result = await sendPhoneVerification(phoneNumber);
      setConfirmationResult(result);
      toast.success('New verification code sent');
    } catch (error: any) {
      console.error('❌ Error resending OTP:', error);
      setError('Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (name: string, role: UserRole) => {
    setLoading(true);
    setError('');

    try {
      console.log('👤 Creating user profile...');
      
      // Generate custom token for Supabase
      const customToken = await getFirebaseCustomToken(phoneNumber);
      
      // Create or get user in Supabase using phone number
      // First check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

      let userId: string;

      if (existingProfile) {
        // User exists, update their info
        userId = existingProfile.id;
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name,
            role,
            phone: phoneNumber
          })
          .eq('id', userId);

        if (updateError) throw updateError;
      } else {
        // Create new user - generate a UUID for them
        userId = crypto.randomUUID();
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            name,
            phone: phoneNumber,
            email: null, // Phone-only user
            role
          });

        if (insertError) throw insertError;
      }

      // Create a mock session for permanent storage
      const mockSession = {
        access_token: customToken,
        refresh_token: customToken,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: userId,
          phone: phoneNumber,
          email: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          aud: 'authenticated',
          role: 'authenticated'
        }
      };

      // Save to permanent session
      PermanentSession.saveSession({
        userId,
        email: '',
        userRole: role,
        isLoggedIn: true,
        session: mockSession as any
      });

      // Update auth context
      setAuth(true, role, userId);

      toast.success('Account created successfully!');

      // Navigate based on role
      if (role === 'merchant') {
        // Check if merchant needs onboarding
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('address, lat, lng')
          .eq('user_id', userId)
          .single();
          
        const needsOnboarding = !merchantData || 
                              !merchantData.address || 
                              merchantData.address.trim() === '' ||
                              (merchantData.lat === 0 && merchantData.lng === 0);
                              
        if (needsOnboarding) {
          navigate('/merchant/onboarding', { replace: true });
        } else {
          navigate('/merchant', { replace: true });
        }
      } else {
        navigate('/home', { replace: true });
      }

    } catch (error: any) {
      console.error('❌ Error creating account:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setConfirmationResult(null);
    } else if (step === 'details') {
      setStep('otp');
    }
    setError('');
  };

  return (
    <motion.div 
      className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-booqit-primary/10 to-white p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-md">
        <motion.div 
          className="mb-8 text-center"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
        >
          <h1 className="text-3xl font-righteous text-booqit-dark mb-2">Welcome to BooqIt</h1>
          <p className="text-booqit-dark/70 font-poppins">Sign in with your phone number</p>
        </motion.div>

        {step === 'phone' && (
          <PhoneInput
            onSendOTP={handleSendOTP}
            loading={loading}
            error={error}
          />
        )}

        {step === 'otp' && (
          <OTPVerification
            phoneNumber={phoneNumber}
            onVerifyOTP={handleVerifyOTP}
            onResendOTP={handleResendOTP}
            onBack={handleBack}
            loading={loading}
            error={error}
          />
        )}

        {step === 'details' && (
          <UserDetailsForm
            phoneNumber={phoneNumber}
            onComplete={handleCompleteRegistration}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </motion.div>
  );
};

export default PhoneAuthPage;
