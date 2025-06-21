
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2 } from 'lucide-react';

const VerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processVerification = async () => {
      console.log('Processing verification callback...');
      
      // Get parameters from URL
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      console.log('Verification params:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        type, 
        error,
        errorDescription 
      });

      // Handle error cases
      if (error) {
        console.error('Verification error:', error, errorDescription);
        let errorMessage = 'The reset link is invalid or has expired.';
        
        if (error === 'access_denied') {
          errorMessage = 'Access denied. Please request a new reset link.';
        } else if (errorDescription) {
          errorMessage = errorDescription;
        }

        toast({
          title: "Reset Link Error",
          description: errorMessage,
          variant: "destructive",
        });
        navigate('/forgot-password');
        return;
      }
      
      // Handle password recovery
      if (type === 'recovery' && accessToken && refreshToken) {
        console.log('Valid recovery link detected, setting session...');
        
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
            throw error;
          }
          
          console.log('Session set successfully, redirecting to reset password...');
          
          // Redirect to reset password page
          navigate('/reset-password', { replace: true });
        } catch (error) {
          console.error('Failed to set session:', error);
          toast({
            title: "Invalid Reset Link",
            description: "The reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
          navigate('/forgot-password');
        }
      } else {
        console.log('Invalid verification parameters');
        toast({
          title: "Invalid Reset Link",
          description: "The reset link is invalid or has expired. Please request a new one.",
          variant: "destructive",
        });
        navigate('/forgot-password');
      }
    };

    processVerification();
  }, [navigate, toast, searchParams]);

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
