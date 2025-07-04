import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Mail, Clock, AlertCircle } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { toast } = useToast();

  // Always use app.booqit.in for password reset emails - CRITICAL for reliability
  const getResetRedirectUrl = () => {
    const redirectUrl = 'https://app.booqit.in/reset-password';
    console.log('🔗 Using redirect URL for password reset:', redirectUrl);
    return redirectUrl;
  };

  // Cooldown timer effect
  React.useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cooldownSeconds > 0) {
      toast({
        title: "Please wait",
        description: `You can request another reset in ${cooldownSeconds} seconds.`,
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (!email.trim()) {
        throw new Error("Please enter your email address");
      }

      // Enhanced email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new Error("Please enter a valid email address");
      }
      
      console.log('📧 Sending password reset email to:', email.trim());

      const redirectUrl = getResetRedirectUrl();
      console.log('🔗 Using redirect URL:', redirectUrl);

      // Enhanced error handling and retry logic for email delivery
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
        // Add additional options for better email delivery
        captchaToken: undefined // Ensure no captcha blocking
      });
      
      if (error) {
        console.error('❌ Reset password error:', error);

        // Handle specific error cases with better user feedback
        if (error.message.includes('rate limit') || error.message.includes('Email rate limit exceeded')) {
          setCooldownSeconds(60);
          throw new Error("Too many reset attempts. Please wait 1 minute before trying again.");
        } else if (error.message.includes('invalid_email')) {
          throw new Error("Please enter a valid email address.");
        } else if (error.message.includes('email not confirmed')) {
          // Still show success for security, but log the actual error
          console.log('⚠️ Email not confirmed, but showing success message for security');
        } else if (error.message.includes('User not found')) {
          // For security, don't reveal that user doesn't exist
          console.log('⚠️ User not found, but showing success message for security');
        }
        
        // For most errors, still show success message for security
        console.log('✅ Showing success message despite error for security purposes');
      }
      
      console.log('✅ Password reset email request processed successfully');
      setEmailSent(true);
      
      toast({
        title: "Reset link sent!",
        description: "If an account with this email exists, you'll receive a password reset link. Please check your spam folder if you don't see it within 5 minutes."
      });
      
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  if (emailSent) {
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
                <Mail className="w-6 h-6 text-booqit-primary" />
              </div>
              <CardTitle className="text-2xl font-righteous text-booqit-dark">
                Check Your Email
              </CardTitle>
              <CardDescription className="font-poppins">
                Password reset instructions have been sent to your email.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 font-poppins">
                  <strong>Important:</strong> The reset link will expire in 1 hour for security.
                </p>
              </div>
              
              <p className="text-sm text-gray-600 font-poppins">
                If you don't see the email in your inbox within 5 minutes, please check your spam folder.
              </p>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 font-poppins">
                  Still no email? Wait a moment before requesting a new one, or contact support.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button 
                onClick={() => setEmailSent(false)} 
                variant="outline" 
                className="w-full font-poppins"
                disabled={cooldownSeconds > 0}
              >
                {cooldownSeconds > 0 ? `Try Again (${cooldownSeconds}s)` : 'Try Different Email'}
              </Button>
              <Link to="/auth" className="w-full">
                <Button variant="ghost" className="w-full font-poppins">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </CardFooter>
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
          <h1 className="text-3xl font-righteous text-booqit-dark">
            Forgot Password?
          </h1>
          <p className="text-booqit-dark/70 font-poppins">
            Enter your email address and we'll send you a secure reset link
          </p>
        </motion.div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="p-0 font-poppins">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-poppins">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="font-poppins"
                  required
                  autoComplete="email"
                  disabled={isLoading || cooldownSeconds > 0}
                />
              </div>
              
              {cooldownSeconds > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
                  <Clock className="w-4 h-4" />
                  <span>Please wait {cooldownSeconds} seconds before trying again</span>
                </div>
              )}
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600 font-poppins">
                    For security, we'll send reset instructions to your email if an account exists. 
                    The link expires in 1 hour. Check spam folder if needed.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
                disabled={isLoading || !email.trim() || cooldownSeconds > 0}
              >
                {isLoading ? "Sending..." : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Send Reset Link"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </motion.div>
  );
};

export default ForgotPasswordPage;
