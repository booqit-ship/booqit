
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Lock } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handlePasswordReset = async () => {
      console.log('Checking for password reset session...');
      
      // Check for access_token and refresh_token in URL parameters
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      console.log('URL params:', { 
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken, 
        type, 
        error,
        errorDescription 
      });

      // Handle error cases first
      if (error) {
        console.error('URL contains error:', error, errorDescription);
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
      
      if (type === 'recovery' && accessToken && refreshToken) {
        console.log('Valid reset link detected, setting session...');
        
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
            throw error;
          }
          
          console.log('Session set successfully:', data);
          setIsValidSession(true);
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
        // Check if there's already a valid session (e.g., user came here directly)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Session check:', sessionData, 'Error:', sessionError);
        
        if (sessionData?.session) {
          console.log('Found existing valid session');
          setIsValidSession(true);
        } else {
          console.log('No valid session or reset parameters found');
          toast({
            title: "Invalid Reset Link",
            description: "The reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
          navigate('/forgot-password');
        }
      }
    };

    handlePasswordReset();
  }, [navigate, toast, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidSession) {
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
      if (!password || !confirmPassword) {
        throw new Error("Please fill in all fields");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      console.log('Updating password...');

      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);
        
        // Handle specific error cases
        if (error.message.includes('session_not_found') || error.message.includes('invalid_token')) {
          throw new Error("Your session has expired. Please request a new reset link.");
        }
        
        throw error;
      }

      console.log('Password updated successfully:', data);

      toast({
        title: "Password Updated!",
        description: "Your password has been successfully updated.",
      });

      // Sign out the user after successful password reset for security
      await supabase.auth.signOut();

      // Redirect to login page
      navigate('/auth');
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.message.includes('session') || error.message.includes('token')) {
        toast({
          title: "Session Expired",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate('/forgot-password');
      } else {
        toast({
          title: "Error!",
          description: error.message || "Failed to update password.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while validating session
  if (!isValidSession) {
    return (
      <motion.div 
        className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-booqit-primary/10 to-white p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-booqit-primary/10 rounded-full flex items-center justify-center animate-spin">
            <Lock className="w-6 h-6 text-booqit-primary" />
          </div>
          <p className="text-booqit-dark/70 font-poppins">
            Validating reset link...
          </p>
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

              {password && (
                <div className="text-xs text-gray-500 font-poppins">
                  Password must be at least 6 characters long
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </motion.div>
  );
};

export default ResetPasswordPage;
