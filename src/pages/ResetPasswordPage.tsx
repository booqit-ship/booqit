
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [isValidating, setIsValidating] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorState, setErrorState] = useState<{
    show: boolean;
    type: 'expired' | 'not_found' | 'invalid';
    message: string;
  }>({ show: false, type: 'invalid', message: '' });
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handlePasswordReset = async () => {
      console.log('🔍 Starting password reset validation...');
      console.log('Current URL:', window.location.href);
      console.log('Search params:', Object.fromEntries(searchParams));
      
      try {
        // Check for error parameters first
        const error = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.log('❌ URL contains error params:', { error, errorCode, errorDescription });
          handleResetError('expired', 'This password reset link has expired or is invalid.');
          return;
        }

        // For modern PKCE flow, check for access_token and refresh_token
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const tokenType = searchParams.get('type');
        
        if (accessToken && refreshToken && tokenType === 'recovery') {
          console.log('🔑 Found recovery tokens, setting session...');
          
          // Set the session using the tokens
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionError) {
            console.error('❌ Session setting failed:', sessionError);
            handleResetError('invalid', `Session error: ${sessionError.message}`);
            return;
          }
          
          if (!data.session || !data.user) {
            console.log('❌ No session created from tokens');
            handleResetError('not_found', 'Unable to verify the reset tokens.');
            return;
          }
          
          console.log('✅ Recovery session established successfully');
          console.log('User email:', data.user.email);
          
          setUserEmail(data.user.email || '');
          
          toast({
            title: "Reset Link Verified",
            description: "You can now set your new password.",
          });
          
          setIsValidating(false);
          return;
        }

        // Fallback: Check for legacy code parameter
        const code = searchParams.get('code');
        
        if (code) {
          console.log('🔄 Processing legacy reset code...');
          
          // Try to exchange the code for a session without clearing existing session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          console.log('Exchange result:', { data: !!data, error: exchangeError });
          
          if (exchangeError) {
            console.error('❌ Code exchange failed:', exchangeError);
            
            // Handle specific error cases
            if (exchangeError.message?.toLowerCase().includes('not found') || 
                exchangeError.message?.toLowerCase().includes('user not found')) {
              handleResetError('not_found', 'Account not found. This reset link may be for an account that no longer exists.');
            } else if (exchangeError.message?.toLowerCase().includes('expired') || 
                       exchangeError.message?.toLowerCase().includes('invalid')) {
              handleResetError('expired', 'This password reset link has expired or is invalid. Please request a new one.');
            } else {
              handleResetError('invalid', `Reset link error: ${exchangeError.message}`);
            }
            return;
          }
          
          if (!data?.session || !data?.user) {
            console.log('❌ No session created from code exchange');
            handleResetError('not_found', 'Account not found. Unable to verify the reset link.');
            return;
          }
          
          console.log('✅ Reset session established successfully from code');
          console.log('User email:', data.user.email);
          
          setUserEmail(data.user.email || '');
          
          toast({
            title: "Reset Link Verified",
            description: "You can now set your new password.",
          });
          
          setIsValidating(false);
          return;
        }

        // Check if we might be in a direct navigation scenario (no params)
        if (searchParams.toString() === '') {
          console.log('🔄 Direct navigation detected, checking existing session...');
          const { data: currentSession } = await supabase.auth.getSession();
          
          if (currentSession?.session?.user) {
            console.log('✅ Found existing session for reset');
            setUserEmail(currentSession.session.user.email || '');
            setIsValidating(false);
            return;
          }
        }
        
        // No valid reset parameters found
        console.log('❌ No valid reset parameters found');
        handleResetError('invalid', 'Invalid reset link. Please request a new password reset.');
        
      } catch (error: any) {
        console.error('❌ Unexpected error during reset validation:', error);
        handleResetError('invalid', `Unexpected error: ${error.message}`);
      }
    };

    const handleResetError = (type: 'expired' | 'not_found' | 'invalid', message: string) => {
      setErrorState({ show: true, type, message });
      setIsValidating(false);
      toast({
        title: "Reset Link Issue",
        description: message,
        variant: "destructive",
      });
      
      // Auto-redirect after 3 seconds
      setTimeout(() => navigate('/forgot-password'), 3000);
    };

    handlePasswordReset();
  }, [searchParams, navigate, toast]);

  // Enhanced password validation
  const validatePassword = (password: string): boolean => {
    if (password.length < 6) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userEmail) {
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

      // Verify current session is still valid
      const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionCheck.session) {
        throw new Error("Your reset session has expired. Please request a new reset link.");
      }

      // Update the password
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Password update error:', error);
        
        if (error.message?.includes('session')) {
          throw new Error("Your reset session has expired. Please request a new reset link.");
        } else if (error.message?.includes('same')) {
          throw new Error("New password must be different from your current password.");
        } else if (error.message?.includes('weak')) {
          throw new Error("Password is too weak. Please use a stronger password.");
        } else {
          throw new Error(error.message || "Failed to update password. Please try again.");
        }
      }

      console.log('✅ Password updated successfully');
      
      setResetSuccess(true);
      
      toast({
        title: "Password Updated!",
        description: "Your password has been successfully updated. Redirecting to login...",
      });

      // Sign out and redirect after success
      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
          navigate('/auth');
        } catch (signOutError) {
          console.warn('Sign out error (non-critical):', signOutError);
          navigate('/auth');
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
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
                Your password has been successfully updated. Redirecting to login...
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

  // Show error state
  if (errorState.show) {
    const getErrorIcon = () => {
      switch (errorState.type) {
        case 'not_found': return <AlertCircle className="w-6 h-6 text-red-600" />;
        case 'expired': return <AlertCircle className="w-6 h-6 text-orange-600" />;
        default: return <AlertCircle className="w-6 h-6 text-red-600" />;
      }
    };

    const getErrorTitle = () => {
      switch (errorState.type) {
        case 'not_found': return 'Account Not Found';
        case 'expired': return 'Reset Link Expired';
        default: return 'Invalid Reset Link';
      }
    };

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
                {getErrorIcon()}
              </div>
              <CardTitle className="text-2xl font-righteous text-booqit-dark">
                {getErrorTitle()}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-booqit-dark/70 font-poppins mb-4">
                {errorState.message}
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

  // Show password reset form
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
            {userEmail ? `Reset password for ${userEmail}` : 'Enter your new password below'}
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
                <Label htmlFor="confirmPassword" className="font-poppins">Confirm New Password</Label>
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

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-700 font-poppins">
                  <strong>Note:</strong> Your new password must be different from your previous password.
                </p>
              </div>
            </CardContent>
            <CardContent>
              <Button 
                type="submit" 
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
                disabled={isLoading || !password || !confirmPassword || password !== confirmPassword || !validatePassword(password)}
              >
                {isLoading ? "Updating Password..." : "Update Password"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </motion.div>
  );
};

export default ResetPasswordPage;
