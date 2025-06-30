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
      console.log('🔍 Processing email verification...');
      console.log('Current URL:', window.location.href);
      
      // Get parameters from URL
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const confirmationCode = searchParams.get('code');
      const type = searchParams.get('type');
      const urlError = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      console.log('Verification params:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        hasConfirmationCode: !!confirmationCode,
        type, 
        error: urlError,
        errorDescription 
      });

      // Handle URL errors first
      if (urlError) {
        console.error('❌ URL verification error:', urlError, errorDescription);
        setError('The verification link is invalid or has expired. Please register again.');
        setIsProcessing(false);
        return;
      }

      // STEP 1: Check if user already has a valid session (post-verification redirect)
      try {
        console.log('🔍 Checking for existing session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionData.session && sessionData.session.user) {
          console.log('✅ Found existing valid session - verification was successful!');
          await handleSuccessfulVerification(sessionData.session, sessionData.session.user);
          return;
        }
        
        if (sessionError) {
          console.log('⚠️ Session check error (will continue with token verification):', sessionError.message);
        }
      } catch (error) {
        console.log('⚠️ Session check failed (will continue with token verification):', error);
      }

      // STEP 2: Try token-based verification if no session exists
      if (confirmationCode) {
        await handleTokenVerification(confirmationCode);
      } else if (type === 'signup' && accessToken && refreshToken) {
        await handleLegacyVerification(accessToken, refreshToken);
      } else {
        console.log('❌ Invalid verification parameters');
        setError('Invalid verification link. Please register again.');
        setIsProcessing(false);
      }
    };

    const handleTokenVerification = async (confirmationCode: string) => {
      try {
        console.log('🔐 Processing confirmation code verification...');
        
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: confirmationCode,
          type: 'signup'
        });
        
        if (verifyError) {
          console.error('❌ OTP Verification error:', verifyError);
          
          // Check if account is already verified
          if (verifyError.message?.includes('already confirmed') || 
              verifyError.message?.includes('already signed up') ||
              verifyError.message?.includes('Email link is invalid or has expired')) {
            console.log('✅ Account already verified, checking for session...');
            
            // Try to get current session one more time
            const { data: sessionData } = await supabase.auth.getSession();
            
            if (sessionData.session) {
              console.log('✅ Found session for already verified account');
              await handleSuccessfulVerification(sessionData.session, sessionData.session.user);
              return;
            } else {
              // Account exists but no session, direct to login with success message
              setSuccess(true);
              toast({
                title: "Account Already Verified!",
                description: "Your account is ready. Please log in to continue.",
              });
              
              setTimeout(() => {
                navigate('/auth', { replace: true });
              }, 2000);
              return;
            }
          }
          
          throw new Error(verifyError.message || 'Email verification failed');
        }
        
        if (!data.session || !data.user) {
          throw new Error('Invalid verification response');
        }
        
        console.log('✅ Email confirmed successfully with confirmation code');
        await handleSuccessfulVerification(data.session, data.user);
        
      } catch (error: any) {
        console.error('❌ Confirmation code verification failed:', error);
        handleVerificationError(error);
      } finally {
        setIsProcessing(false);
      }
    };

    const handleLegacyVerification = async (accessToken: string, refreshToken: string) => {
      try {
        console.log('🔐 Processing legacy email confirmation...');
        
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          
          if (sessionError.message?.includes('already confirmed')) {
            setSuccess(true);
            toast({
              title: "Account Already Verified!",
              description: "Your account is ready. Please log in to continue.",
            });
            
            setTimeout(() => {
              navigate('/auth', { replace: true });
            }, 2000);
            return;
          }
          
          throw new Error(sessionError.message || 'Failed to confirm email');
        }
        
        if (!sessionData.session || !sessionData.user) {
          throw new Error('Invalid session data received');
        }
        
        console.log('✅ Email confirmed successfully (legacy)');
        await handleSuccessfulVerification(sessionData.session, sessionData.user);
        
      } catch (error: any) {
        console.error('❌ Legacy verification failed:', error);
        handleVerificationError(error);
      } finally {
        setIsProcessing(false);
      }
    };

    const handleSuccessfulVerification = async (session: any, user: any) => {
      try {
        console.log('🎉 Processing successful verification for user:', user.id);
        
        // Get user role from metadata
        const userRole = user.user_metadata?.role as UserRole || 'customer';
        
        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: user.user_metadata?.name || 'User',
            email: user.email || '',
            phone: user.user_metadata?.phone || null,
            role: userRole,
            notification_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (profileError) {
          console.error('⚠️ Profile creation error (continuing anyway):', profileError);
        } else {
          console.log('✅ Profile created/updated successfully');
        }

        // Create merchant record if needed
        if (userRole === 'merchant') {
          const { error: merchantError } = await supabase
            .from('merchants')
            .insert({
              user_id: user.id,
              shop_name: `${user.user_metadata?.name || 'User'}'s Shop`,
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
            console.error('⚠️ Merchant record creation error (continuing anyway):', merchantError);
          } else {
            console.log('✅ Merchant record created successfully');
          }
        }

        // Save session
        PermanentSession.saveSession(session, userRole, user.id);
        
        setSuccess(true);
        
        toast({
          title: "Email Verified Successfully!",
          description: "Your account has been verified. Redirecting to your dashboard...",
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
        console.error('⚠️ Error in success handler (showing success anyway):', error);
        // Even if profile creation fails, verification was successful
        setSuccess(true);
        toast({
          title: "Email Verified!",
          description: "Your account has been verified successfully.",
        });
        
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      }
    };

    const handleVerificationError = (error: any) => {
      let errorMessage = 'Email verification failed.';
      
      if (error.message?.includes('expired')) {
        errorMessage = 'This verification link has expired. Please register again.';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'This verification link is invalid. Please register again.';
      } else if (error.message?.includes('already confirmed')) {
        // This should be handled as success now
        errorMessage = 'This account is already verified. Please log in.';
      }
      
      setError(errorMessage);
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
                Email Verified Successfully!
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
