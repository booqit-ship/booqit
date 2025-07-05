
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handlePasswordReset = async () => {
      console.log('🔍 Starting password reset validation...');
      console.log('Current URL:', window.location.href);
      console.log('Location:', location.pathname + location.search + location.hash);
      
      // Check for error parameters first
      const error = searchParams.get('error');
      const errorCode = searchParams.get('error_code');
      const errorDescription = searchParams.get('error_description');
      
      if (error) {
        console.log('❌ Reset link error detected:', { error, errorCode, errorDescription });
        
        let errorMessage = 'This reset link is invalid or has expired.';
        
        if (errorCode === 'otp_expired' || error === 'access_denied') {
          errorMessage = 'This password reset link has expired or is invalid. Please request a new one.';
        }
        
        toast({
          title: "Invalid Reset Link",
          description: errorMessage,
          variant: "destructive",
        });
        
        setTimeout(() => navigate('/forgot-password'), 3000);
        setIsValidating(false);
        return;
      }

      // Extract tokens from URL (both query params and hash fragments)
      const getTokenFromUrl = (param: string): string | null => {
        // First check URL search params
        const fromParams = searchParams.get(param);
        if (fromParams) return fromParams;
        
        // Then check hash fragment
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        return hashParams.get(param);
      };

      const accessToken = getTokenFromUrl('access_token');
      const refreshToken = getTokenFromUrl('refresh_token');
      const type = getTokenFromUrl('type');
      
      console.log('🔐 Extracted tokens:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        type,
        accessTokenLength: accessToken?.length || 0,
        refreshTokenLength: refreshToken?.length || 0
      });

      if (accessToken && refreshToken && type === 'recovery') {
        try {
          console.log('🔄 Setting recovery session...');
          
          // Clear any existing session first
          await supabase.auth.signOut();
          
          // Small delay to ensure signOut completes
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Set the new session with the recovery tokens
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            throw new Error(`Session error: ${sessionError.message}`);
          }
          
          if (data.session && data.user) {
            console.log('✅ Recovery session established successfully');
            console.log('User ID:', data.user.id);
            console.log('Session expires at:', data.session.expires_at);
            
            setShowReset(true);
            toast({
              title: "Reset Link Verified",
              description: "You can now set your new password.",
            });
          } else {
            throw new Error('No session or user returned from setSession');
          }
        } catch (error: any) {
          console.error('❌ Failed to establish recovery session:', error);
          
          toast({
            title: "Session Error",
            description: `Unable to verify reset link: ${error.message}`,
            variant: "destructive",
          });
          
          setTimeout(() => navigate('/forgot-password'), 2000);
        }
      } else {
        console.log('❌ Missing required tokens or invalid type');
        console.log('Required: access_token, refresh_token, type=recovery');
        console.log('Got:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
        
        toast({
          title: "Invalid Reset Link", 
          description: "This reset link is missing required information. Please request a new one.",
          variant: "destructive",
        });
        
        setTimeout(() => navigate('/forgot-password'), 2000);
      }
      
      setIsValidating(false);
    };

    handlePasswordReset();
  }, [searchParams, location, navigate, toast]);

  // Enhanced password validation
  const validatePassword = (password: string): boolean => {
    if (password.length < 6) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showReset) {
      toast({
        title: "Session Invalid",
        description: "Please request a new password reset link.",
        variant: "destructive",
      });
      navigate('/forgot-password');
      return;
    }

    setIsLoading(true);

    try {
      // Validate inputs
      if (!password || !confirmPassword) {
        throw new Error("Please fill in all fields");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (!validatePassword(password)) {
        throw new Error("Password must be 6+ characters with 1 uppercase and 1 special character.");
      }

      console.log('🔄 Updating password...');

      // Verify we still have a valid session before updating
      const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionCheck.session) {
        throw new Error("Your session has expired. Please request a new reset link.");
      }

      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Password update error:', error);
        throw new Error(error.message || "Failed to update password");
      }

      console.log('✅ Password updated successfully');
      
      setResetSuccess(true);
      
      toast({
        title: "Password Updated!",
        description: "Your password has been successfully updated.",
      });

      // Sign out for security and redirect to login after a delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/auth');
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show success state
  if (resetSuccess) {
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
                Password Updated!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-booqit-dark/70 font-poppins mb-4">
                Your password has been successfully updated. You'll be redirected to login shortly.
              </p>
              <div className="w-6 h-6 border-2 border-booqit-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // Show loading state while validating session
  if (isValidating) {
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
                <Lock className="w-6 h-6 text-booqit-primary animate-pulse" />
              </div>
              <CardTitle className="text-2xl font-righteous text-booqit-dark">
                Validating Reset Link
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-booqit-dark/70 font-poppins">
                Please wait while we validate your password reset link...
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // Show error state if no valid session
  if (!showReset) {
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
                Invalid Reset Link
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-booqit-dark/70 font-poppins mb-4">
                This password reset link is invalid or has expired.
              </p>
              <Button 
                onClick={() => navigate('/forgot-password')} 
                className="bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
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
        <motion.div 
          className="mb-8 text-center"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
        >
          <div className="mx-auto mb-4 w-12 h-12 bg-booqit-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-booqit-primary" />
          </div>
          <h1 className="text-3xl font-righteous text-booqit-dark">
            Reset Password
          </h1>
          <p className="text-booqit-dark/70 font-poppins">
            Enter your new password below
          </p>
        </motion.div>

        <Card className="border-none shadow-lg">
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="font-poppins">New Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-poppins pr-10"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-poppins">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="font-poppins pr-10"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {password && !validatePassword(password) && (
                <div className="text-sm text-red-600 font-poppins">
                  Password must be 6+ characters with 1 uppercase and 1 special character.
                </div>
              )}
              
              {password && confirmPassword && password !== confirmPassword && (
                <div className="text-sm text-red-600 font-poppins">
                  Passwords do not match
                </div>
              )}
            </CardContent>
            <CardContent>
              <Button 
                type="submit" 
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
                disabled={isLoading || !password || !confirmPassword || password !== confirmPassword || !validatePassword(password)}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </motion.div>
  );
};

export default ResetPasswordPage;
