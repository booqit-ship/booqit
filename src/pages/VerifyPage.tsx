
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types';
import { PermanentSession } from '@/utils/permanentSession';

const VerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const processVerification = async () => {
      console.log('Processing email verification...');
      console.log('Current URL:', window.location.href);
      
      // Get parameters from URL
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      const urlError = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      console.log('Verification params:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        type, 
        error: urlError,
        errorDescription 
      });

      // Handle URL errors first
      if (urlError) {
        console.error('URL verification error:', urlError, errorDescription);
        let errorMessage = 'The verification link is invalid or has expired.';
        
        if (urlError === 'access_denied') {
          errorMessage = 'Access denied. Please try registering again.';
        } else if (errorDescription) {
          errorMessage = errorDescription;
        }

        setError(errorMessage);
        setIsProcessing(false);
        return;
      }
      
      // Handle email confirmation
      if (type === 'signup' && accessToken && refreshToken) {
        try {
          console.log('Processing email confirmation...');
          
          // Set the session to confirm email
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            console.error('Session error:', sessionError);
            throw new Error(sessionError.message || 'Failed to confirm email');
          }
          
          if (!sessionData.session || !sessionData.user) {
            throw new Error('Invalid session data received');
          }
          
          console.log('✅ Email confirmed successfully');
          
          // Get user role from metadata
          const userRole = sessionData.user.user_metadata?.role as UserRole || 'customer';
          
          // Create profile record
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: sessionData.user.id,
              name: sessionData.user.user_metadata?.name || 'User',
              email: sessionData.user.email || '',
              phone: sessionData.user.user_metadata?.phone || null,
              role: userRole,
              notification_enabled: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });

          if (profileError) {
            console.error('❌ Profile creation error:', profileError);
            // Don't fail verification for profile errors
          }

          // Create merchant record if needed
          if (userRole === 'merchant') {
            const { error: merchantError } = await supabase
              .from('merchants')
              .insert({
                user_id: sessionData.user.id,
                shop_name: `${sessionData.user.user_metadata?.name || 'User'}'s Shop`,
                address: '',
                category: 'salon',
                gender_focus: 'unisex',
                lat: 0,
                lng: 0,
                open_time: '09:00',
                close_time: '18:00',
                description: '',
              });

            if (merchantError && !merchantError.message?.includes('duplicate')) {
              console.error('❌ Merchant record creation error:', merchantError);
            }
          }

          // Save session
          PermanentSession.saveSession(sessionData.session, userRole, sessionData.user.id);
          
          setSuccess(true);
          
          toast({
            title: "Email Verified!",
            description: "Your account has been successfully verified. Redirecting...",
          });
          
          // Redirect after success
          setTimeout(() => {
            if (userRole === 'merchant') {
              navigate('/merchant/onboarding', { replace: true });
            } else {
              navigate('/home', { replace: true });
            }
          }, 2000);
          
        } catch (error: any) {
          console.error('Verification failed:', error);
          
          let errorMessage = 'Email verification failed.';
          
          if (error.message?.includes('expired')) {
            errorMessage = 'This verification link has expired. Please register again.';
          } else if (error.message?.includes('invalid')) {
            errorMessage = 'This verification link is invalid. Please register again.';
          }
          
          setError(errorMessage);
        }
      } else {
        // Invalid verification attempt
        console.log('Invalid verification parameters');
        setError('Invalid verification link. Please register again.');
      }
      
      setIsProcessing(false);
    };

    processVerification();
  }, [navigate, toast, searchParams]);

  const handleRegisterAgain = () => {
    navigate('/auth');
  };

  if (success) {
    return (
      <motion.div 
        className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-booqit-primary/10 to-white p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full max-w-md">
          <Card className="border-none shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-righteous text-booqit-dark">
                Email Verified!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-booqit-dark/70 font-poppins mb-4">
                Your account has been successfully verified. You're being redirected to your dashboard.
              </p>
              <div className="w-6 h-6 border-2 border-booqit-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-booqit-primary/10 to-white p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full max-w-md">
          <Card className="border-none shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-righteous text-booqit-dark">
                Verification Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-booqit-dark/70 font-poppins">
                {error}
              </p>
              <Button 
                onClick={handleRegisterAgain}
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
              >
                Register Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-booqit-primary/10 to-white p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-md">
        <Card className="border-none shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-booqit-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-booqit-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl font-righteous text-booqit-dark">
              Verifying Email
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-booqit-dark/70 font-poppins">
              Please wait while we verify your email address...
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default VerifyPage;
