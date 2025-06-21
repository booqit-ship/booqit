import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Mail, Clock } from 'lucide-react';
const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const {
    toast
  } = useToast();

  // Get the current domain dynamically
  const getCurrentDomain = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://11abe201-5c2e-4bfd-8399-358f356fd184.lovableproject.com';
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
      if (!email) {
        throw new Error("Please enter your email address");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address");
      }
      console.log('Sending password reset email to:', email);

      // Use the current domain for redirect URL
      const redirectUrl = `${getCurrentDomain()}/verify`;
      console.log('Using redirect URL:', redirectUrl);

      // Call Supabase to send password reset email
      const {
        data,
        error
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      console.log('Reset password response:', {
        data,
        error
      });
      if (error) {
        console.error('Reset password error:', error);

        // Handle specific error cases
        if (error.message.includes('rate limit') || error.message.includes('30 seconds')) {
          setCooldownSeconds(30);
          throw new Error("Too many reset attempts. Please wait 30 seconds before trying again.");
        } else if (error.message.includes('invalid_email')) {
          throw new Error("Please enter a valid email address.");
        } else {
          // For any other error, still show success message for security
          console.log('Showing success message despite error for security');
          setEmailSent(true);
          toast({
            title: "Reset link sent!",
            description: "If an account with this email exists, you'll receive a password reset link. Please check your spam folder if you don't see it."
          });
          return;
        }
      }
      console.log('Password reset email sent successfully');
      setEmailSent(true);
      toast({
        title: "Reset link sent!",
        description: "Check your email for a password reset link. Please also check your spam folder."
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error!",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  if (emailSent) {
    return <motion.div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-booqit-primary/10 to-white p-6" initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} transition={{
      duration: 0.5
    }}>
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
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 font-poppins">
                  📧 <strong>Check your spam folder!</strong> Reset emails sometimes end up there.
                </p>
              </div>
              <p className="text-sm text-gray-500 font-poppins">
                Didn't receive the email? Try again or contact support.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button onClick={() => setEmailSent(false)} variant="outline" className="w-full font-poppins">
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
      </motion.div>;
  }
  return <motion.div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-booqit-primary/10 to-white p-6" initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} transition={{
    duration: 0.5
  }}>
      <div className="w-full max-w-md">
        <motion.div className="mb-8 text-center" initial={{
        y: -20
      }} animate={{
        y: 0
      }}>
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
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="font-poppins" required autoComplete="email" disabled={isLoading || cooldownSeconds > 0} />
              </div>
              {cooldownSeconds > 0 && <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
                  <Clock className="w-4 h-4" />
                  <span>Please wait {cooldownSeconds} seconds before trying again</span>
                </div>}
              
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins" disabled={isLoading || !email || cooldownSeconds > 0}>
                {isLoading ? "Sending..." : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Send Reset Link"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </motion.div>;
};
export default ForgotPasswordPage;