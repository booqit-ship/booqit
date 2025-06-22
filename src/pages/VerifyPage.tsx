
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processVerification = async () => {
      console.log('Processing password reset verification...');
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
        let errorMessage = 'The reset link is invalid or has expired.';
        
        if (urlError === 'access_denied') {
          errorMessage = 'Access denied. Please request a new reset link.';
        } else if (errorDescription) {
          errorMessage = errorDescription;
        }

        setError(errorMessage);
        setIsProcessing(false);
        return;
      }
      
      // Validate required parameters
      if (type !== 'recovery' || !accessToken || !refreshToken) {
        console.log('Invalid or missing verification parameters');
        setError('Invalid reset link. Please request a new password reset link.');
        setIsProcessing(false);
        return;
      }

      try {
        console.log('Setting session with tokens...');
        
        // Set the session directly
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error(sessionError.message || 'Failed to validate reset link');
        }
        
        if (!sessionData.session) {
          throw new Error('Invalid session data received');
        }
        
        console.log('Session established successfully');
        
        toast({
          title: "Reset Link Valid",
          description: "Redirecting to password reset page...",
        });
        
        // Redirect to reset password page
        setTimeout(() => {
          navigate('/reset-password', { replace: true });
        }, 1000);
        
      } catch (error: any) {
        console.error('Verification failed:', error);
        
        let errorMessage = 'The reset link has expired or is invalid.';
        
        if (error.message?.includes('expired')) {
          errorMessage = 'This reset link has expired. Please request a new one.';
        } else if (error.message?.includes('invalid')) {
          errorMessage = 'This reset link is invalid. Please request a new one.';
        }
        
        setError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    };

    processVerification();
  }, [navigate, toast, searchParams]);

  const handleRequestNewLink = () => {
    navigate('/forgot-password');
  };

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
                Reset Link Invalid
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-booqit-dark/70 font-poppins">
                {error}
              </p>
              <Button 
                onClick={handleRequestNewLink}
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
              >
                Request New Reset Link
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
              Verifying Reset Link
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-booqit-dark/70 font-poppins">
              Please wait while we verify your password reset link...
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default VerifyPage;
