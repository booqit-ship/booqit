
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { ArrowLeft, Mail } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!email) {
        throw new Error("Please enter your email address");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      console.log('Sending password reset email to:', email);
      console.log('Site URL:', window.location.origin);

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      console.log('Reset password response:', { data, error });

      if (error) {
        console.error('Reset password error:', error);
        
        // Handle specific error cases
        if (error.message.includes('rate limit')) {
          throw new Error("Too many reset attempts. Please wait a few minutes and try again.");
        } else if (error.message.includes('invalid_email')) {
          throw new Error("Please enter a valid email address.");
        } else if (error.message.includes('user_not_found')) {
          // For security, we don't reveal if email exists or not
          // Still show success message
          setEmailSent(true);
          toast({
            title: "Reset link sent!",
            description: "If an account with this email exists, you'll receive a password reset link.",
          });
          return;
        } else {
          throw new Error(error.message || "Failed to send reset email. Please try again.");
        }
      }

      console.log('Password reset email sent successfully');
      setEmailSent(true);
      toast({
        title: "Reset link sent!",
        description: "Check your email for a password reset link.",
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error!",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
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
                We've sent a password reset link to your email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 font-poppins mb-4">
                Click the link in the email to reset your password. The link will expire in 24 hours.
              </p>
              <p className="text-sm text-gray-500 font-poppins">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button 
                onClick={() => setEmailSent(false)}
                variant="outline" 
                className="w-full font-poppins"
              >
                Try Different Email
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
            Enter your email address and we'll send you a reset link
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
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </motion.div>
  );
};

export default ForgotPasswordPage;
