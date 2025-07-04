
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkPasswordRecovery = async () => {
      console.log('Checking for password recovery session...');
      
      // Set up auth state change listener for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state change event:', event);
          
          if (event === 'PASSWORD_RECOVERY') {
            console.log('Password recovery event detected');
            setShowReset(true);
            setIsValidating(false);
          }
        }
      );

      // Also check current session state
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('Current session check:', { 
          hasSession: !!session, 
          error: error?.message 
        });
        
        if (session?.user) {
          console.log('Valid session found for password reset');
          setShowReset(true);
        } else {
          // If no session after a brief wait, redirect to forgot password
          setTimeout(() => {
            if (!showReset) {
              console.log('No password recovery session found, redirecting...');
              toast({
                title: "Session Invalid",
                description: "Your reset session has expired. Please request a new reset link.",
                variant: "destructive",
              });
              navigate('/forgot-password');
            }
          }, 3000);
        }
      } catch (error: any) {
        console.error('Session validation error:', error);
      } finally {
        setIsValidating(false);
      }

      return () => subscription.unsubscribe();
    };

    checkPasswordRecovery();
  }, [navigate, toast, showReset]);

  // Enhanced password validation - same as registration
  const validatePassword = (password: string): boolean => {
    if (password.length < 6) return false;
    // At least 1 uppercase letter
    if (!/[A-Z]/.test(password)) return false;
    // At least 1 special character
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

      console.log('Updating password...');

      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);
        
        if (error.message.includes('session_not_found') || 
            error.message.includes('invalid_token') ||
            error.message.includes('expired')) {
          throw new Error("Your session has expired. Please request a new reset link.");
        }
        
        throw new Error(error.message || "Failed to update password");
      }

      console.log('Password updated successfully');

      toast({
        title: "Password Updated!",
        description: "Your password has been successfully updated. Redirecting to login...",
      });

      // Sign out for security and redirect to login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.message.includes('session') || 
          error.message.includes('token') || 
          error.message.includes('expired')) {
        toast({
          title: "Session Expired",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate('/forgot-password');
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update password.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

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
                Validating Session
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-booqit-dark/70 font-poppins">
                Please wait while we validate your session...
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
                Invalid Session
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-booqit-dark/70 font-poppins mb-4">
                Your password reset session has expired or is invalid.
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
