import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import RoleSelection from '@/components/RoleSelection';
import { supabase } from '@/integrations/supabase/client';
import { PermanentSession } from '@/utils/permanentSession';
import { validateCurrentSession } from '@/utils/sessionRecovery';
import { Capacitor } from '@capacitor/core';
import { Eye, EyeOff } from 'lucide-react';

const AuthPage: React.FC = () => {
  const location = useLocation();
  const redirectExecuted = useRef(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isRoleSelected, setIsRoleSelected] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeToPolicies, setAgreeToPolicies] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    name?: string;
    phone?: string;
    general?: string;
  }>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, userRole, loading } = useAuth();

  // Initialize role selection from navigation state
  useEffect(() => {
    const roleFromState = location.state?.selectedRole;
    if (roleFromState) {
      console.log('Role received from navigation state:', roleFromState);
      setSelectedRole(roleFromState);
      setIsRoleSelected(true);
    }
  }, [location.state]);

  // Single consolidated redirect effect with guard
  useEffect(() => {
    if (redirectExecuted.current || loading) return;

    // Check permanent session first for instant redirect
    const permanentData = PermanentSession.getSession();
    if (permanentData.isLoggedIn && permanentData.userRole) {
      console.log('🔄 Redirecting from permanent session...', { userRole: permanentData.userRole });
      redirectExecuted.current = true;
      if (permanentData.userRole === 'merchant') {
        navigate('/merchant', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
      return;
    }

    // Then check auth context state
    if (isAuthenticated && userRole) {
      console.log('🔄 Redirecting from auth context...', { userRole });
      redirectExecuted.current = true;
      if (userRole === 'merchant') {
        navigate('/merchant', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    }
  }, [isAuthenticated, userRole, loading, navigate]);

  // Handle role selection with proper state management
  const handleRoleSelect = (role: UserRole) => {
    console.log('Role selected:', role);
    setSelectedRole(role);
    setIsRoleSelected(true);
  };

  // Handle back to role selection
  const handleBackToRoleSelection = () => {
    setIsRoleSelected(false);
    setSelectedRole(null);
    navigate('/', { replace: true });
  };

  // Handle forgot password click
  const handleForgotPasswordClick = () => {
    navigate('/forgot-password');
  };

  // Handle key down events for form submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Find the form element and trigger submit
      const form = e.currentTarget.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  };

  // Enhanced email validation with duplication check
  const validateEmail = async (email: string): Promise<boolean> => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length === 0) {
      return false;
    }

    try {
      // Check if email already exists using our database function
      const { data, error } = await supabase.rpc('check_email_exists', { 
        email_to_check: trimmedEmail.toLowerCase() 
      });
      
      if (error) {
        console.error('Error checking email existence:', error);
        return true; // Allow signup if check fails
      }
      
      return !data; // Return true if email doesn't exist
    } catch (error) {
      console.error('Error in email validation:', error);
      return true; // Allow signup if check fails
    }
  };

  // Enhanced phone validation - strict +91 format
  const validatePhone = (phone: string): boolean => {
    if (!phone || phone.trim() === '') return true; // Phone is optional
    const cleanPhone = phone.replace(/\s/g, '');
    // Must be exactly 10-15 digits (no +91 prefix in input as it's static)
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(cleanPhone);
  };

  // Enhanced password validation - strict requirements
  const validatePassword = (password: string): boolean => {
    if (password.length < 6) return false;
    // At least 1 uppercase letter
    if (!/[A-Z]/.test(password)) return false;
    // At least 1 special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) return false;
    return true;
  };

  // Handle phone input - only allow digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits and limit to 15 characters
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 15);
    setPhone(digitsOnly);
    clearError('phone');
  };

  // Clear errors when user starts typing
  const clearError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Enhanced form validation with confirm password
  const validateForm = async (isLogin: boolean = false): Promise<boolean> => {
    const newErrors: typeof errors = {};
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    // Email validation with duplication check for signup
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!isLogin) {
      // Check for email duplication only during signup
      const emailAvailable = await validateEmail(trimmedEmail);
      if (!emailAvailable) {
        newErrors.email = 'Email already in use. Please login or use a different email.';
      }
    }

    // Enhanced password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!isLogin && !validatePassword(password)) {
      newErrors.password = 'Password must be 6+ characters with 1 uppercase and 1 special character.';
    } else if (isLogin && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Registration-specific validations
    if (!isLogin) {
      if (!trimmedName) {
        newErrors.name = 'Full name is required';
      } else if (trimmedName.length < 2) {
        newErrors.name = 'Name must be at least 2 characters long';
      }

      if (trimmedPhone && !validatePhone(trimmedPhone)) {
        newErrors.phone = 'Please enter 10-15 digits only';
      }

      // Confirm password validation
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enhanced registration with email duplication prevention
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      console.log('📝 Starting registration with email confirmation...');
      
      // Validate form with async email check
      if (!(await validateForm(false))) {
        setIsLoading(false);
        return;
      }

      if (!agreeToPolicies) {
        setErrors({ general: "Please agree to the Privacy Policy and Terms and Conditions to continue" });
        setIsLoading(false);
        return;
      }

      if (!selectedRole) {
        setErrors({ general: "Please select a role" });
        setIsLoading(false);
        return;
      }

      const emailToRegister = email.trim().toLowerCase();

      // Final email duplication check before signup
      const { data: emailExists } = await supabase.rpc('check_email_exists', { 
        email_to_check: emailToRegister 
      });

      if (emailExists) {
        setErrors({ email: "Email already in use. Please login or use a different email." });
        setIsLoading(false);
        return;
      }

      // Use app.booqit.in/verify for ALL platforms
      const redirectUrl = 'https://app.booqit.in/verify';
      
      console.log('🔗 Using redirect URL:', redirectUrl);
      console.log('📱 Platform info:', {
        isNative: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        currentOrigin: window.location.origin
      });

      // Create user account with email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailToRegister,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name.trim(),
            phone: phone.trim() ? `+91${phone.trim()}` : null, // Add +91 prefix
            role: selectedRole,
          }
        }
      });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        
        if (authError.message?.includes('Password should be at least 6 characters')) {
          setErrors({ password: "Password must be 6+ characters with 1 uppercase and 1 special character." });
        } else if (authError.message?.includes('Unable to validate email address')) {
          setErrors({ email: "Please enter a valid email address." });
        } else if (authError.message?.includes('Signup is disabled')) {
          setErrors({ general: "Registration is currently disabled. Please contact support." });
        } else if (authError.message?.includes('User already registered')) {
          setErrors({ email: "Email already in use. Please login or use a different email." });
        } else {
          setErrors({ general: authError.message || "Failed to create account. Please try again." });
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setErrors({ general: 'Registration failed. Please try again.' });
        setIsLoading(false);
        return;
      }

      console.log('✅ User account created, email confirmation required:', authData.user.id);

      // Show email verification screen
      setRegistrationEmail(emailToRegister);
      setShowEmailVerification(true);
      
      toast({
        title: "Check your email!",
        description: "We've sent you a confirmation link. Please check your email and click the link to verify your account.",
      });

    } catch (error: any) {
      console.error('❌ Registration error:', error);
      if (error.message?.includes('duplicate')) {
        setErrors({ email: 'Email already in use. Please login or use a different email.' });
      } else {
        setErrors({ general: 'Failed to create account. Please check your details and try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced login with improved validation
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      console.log('🔐 Attempting login...');
      
      if (!(await validateForm(true))) {
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        
        if (error.message?.includes('Invalid login credentials')) {
          setErrors({ general: "Invalid email or password. Please check your credentials and try again." });
        } else if (error.message?.includes('Email not confirmed')) {
          // Show email verification screen for unconfirmed accounts
          setRegistrationEmail(email.trim().toLowerCase());
          setShowEmailVerification(true);
          setErrors({ general: "Please check your email and click the confirmation link before logging in." });
        } else if (error.message?.includes('Too many requests')) {
          setErrors({ general: "Too many login attempts. Please wait a moment and try again." });
        } else {
          setErrors({ general: error.message || "Login failed. Please try again." });
        }
        setIsLoading(false);
        return;
      }

      if (data.session && data.user) {
        console.log('✅ Login successful, session created');
        
        // Validate session
        const isValid = await validateCurrentSession();
        
        if (!isValid) {
          setErrors({ general: 'Session validation failed after login' });
          setIsLoading(false);
          return;
        }
        
        // Fetch user role from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('❌ Error fetching user profile:', profileError);
          setErrors({ general: 'Failed to fetch user profile' });
          setIsLoading(false);
          return;
        }

        const userRole = profileData?.role as UserRole;
        console.log('👤 User role fetched:', userRole);
        
        PermanentSession.saveSession(data.session, userRole, data.user.id);
        setAuth(true, userRole, data.user.id);
        
        console.log('🎯 Navigating after login...');
        redirectExecuted.current = true;
        if (userRole === 'merchant') {
          const { data: merchantData } = await supabase
            .from('merchants')
            .select('address, lat, lng')
            .eq('user_id', data.user.id)
            .single();
            
          const needsOnboarding = !merchantData || 
                                !merchantData.address || 
                                merchantData.address.trim() === '' ||
                                (merchantData.lat === 0 && merchantData.lng === 0);
                                
          if (needsOnboarding) {
            navigate('/merchant/onboarding', { replace: true });
          } else {
            navigate('/merchant', { replace: true });
          }
        } else {
          navigate('/home', { replace: true });
        }

        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully.",
        });
      } else {
        setErrors({ general: 'No session created during login' });
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setErrors({ general: error.message || "Login failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const resendConfirmationEmail = async () => {
    if (!registrationEmail) return;
    
    setIsLoading(true);
    try {
      const redirectUrl = 'https://app.booqit.in/verify';

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registrationEmail,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to resend confirmation email. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email sent!",
          description: "We've sent another confirmation email. Please check your inbox.",
        });
      }
    } catch (error) {
      console.error('Error resending confirmation:', error);
      toast({
        title: "Error",
        description: "Failed to resend confirmation email.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show email verification screen
  if (showEmailVerification) {
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
              <CardTitle className="text-2xl font-righteous text-booqit-dark">
                Check Your Email
              </CardTitle>
              <CardDescription className="font-poppins">
                We've sent a confirmation link to:
                <br />
                <strong>{registrationEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-poppins">
                  Please check your email and click the confirmation link to verify your account before logging in.
                </p>
              </div>
              <p className="text-sm text-gray-600 font-poppins">
                Don't forget to check your spam folder if you don't see the email.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                onClick={resendConfirmationEmail}
                variant="outline"
                className="w-full font-poppins"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Resend Confirmation Email"}
              </Button>
              <Button 
                onClick={() => {
                  setShowEmailVerification(false);
                  setRegistrationEmail('');
                }}
                variant="ghost"
                className="w-full font-poppins"
              >
                Back to Login
              </Button>
            </CardFooter>
          </Card>
        </div>
      </motion.div>
    );
  }

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-booqit-primary/10 to-white">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-booqit-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-righteous mb-2">Loading...</h1>
          <p className="text-gray-500 font-poppins">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If role is not selected, show role selection screen
  if (!isRoleSelected || !selectedRole) {
    return <RoleSelection onRoleSelect={handleRoleSelect} />;
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
            {selectedRole === 'customer' ? 'Customer Account' : 'Merchant Account'}
          </h1>
          <p className="text-booqit-dark/70 font-poppins">
            {selectedRole === 'customer' 
              ? 'Access your bookings and profile' 
              : 'Manage your business and appointments'}
          </p>
        </motion.div>

        <Card className="border-none shadow-lg">
          <CardHeader className="py-4">
            <CardDescription>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-0 font-poppins" 
                onClick={handleBackToRoleSelection}
              >
                ← Change Role
              </Button>
            </CardDescription>
          </CardHeader>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" className="font-poppins">Login</TabsTrigger>
              <TabsTrigger value="register" className="font-poppins">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  {errors.general && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      {errors.general}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-poppins">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError('email');
                      }}
                      onKeyDown={handleKeyDown}
                      className={`font-poppins ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                      required
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="font-poppins">Password</Label>
                      <div onClick={handleForgotPasswordClick}>
                        <span className="text-xs p-0 h-auto font-poppins text-booqit-primary hover:text-booqit-primary/80 cursor-pointer hover:underline">
                          Forgot password?
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearError('password');
                        }}
                        onKeyDown={handleKeyDown}
                        className={`font-poppins pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                        required
                        disabled={isLoading}
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
                    {errors.password && (
                      <p className="text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  {errors.general && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                      {errors.general}
                    </div>
                  )}
                  
                  <div className="p-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md">
                    <strong>Email Verification Required:</strong> You'll need to verify your email address before you can log in.
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-poppins">Full Name *</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="Your Full Name" 
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearError('name');
                      }}
                      className={`font-poppins ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                      required
                      disabled={isLoading}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-poppins">Email *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError('email');
                      }}
                      className={`font-poppins ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                      required
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-poppins">Phone Number</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 bg-gray-100 border border-r-0 rounded-l-md font-poppins text-gray-700">
                        +91
                      </div>
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="9876543210" 
                        value={phone}
                        onChange={handlePhoneChange}
                        className={`font-poppins rounded-l-none ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                        disabled={isLoading}
                        maxLength={15}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-600">{errors.phone}</p>
                    )}
                    <p className="text-xs text-gray-500 font-poppins">Enter 10-15 digits only</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="font-poppins">Password *</Label>
                    <div className="relative">
                      <Input 
                        id="new-password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearError('password');
                        }}
                        className={`font-poppins pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                        required
                        disabled={isLoading}
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
                    {errors.password && (
                      <p className="text-sm text-red-600">{errors.password}</p>
                    )}
                    <p className="text-xs text-gray-500 font-poppins">Must have 6+ characters, 1 uppercase, and 1 special character</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="font-poppins">Confirm Password *</Label>
                    <div className="relative">
                      <Input 
                        id="confirm-password" 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          clearError('confirmPassword');
                        }}
                        className={`font-poppins pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                        required
                        disabled={isLoading}
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
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                  
                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox
                      id="agree-policies"
                      checked={agreeToPolicies}
                      onCheckedChange={(checked) => setAgreeToPolicies(checked as boolean)}
                      disabled={isLoading}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="agree-policies"
                        className="text-sm font-poppins text-gray-700 leading-relaxed cursor-pointer"
                      >
                        I agree to the{' '}
                        <Link 
                          to="/privacy-policy" 
                          className="text-booqit-primary hover:underline font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Privacy Policy
                        </Link>
                        {' '}and{' '}
                        <Link 
                          to="/terms-and-conditions" 
                          className="text-booqit-primary hover:underline font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Terms and Conditions
                        </Link>
                      </label>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
                    disabled={isLoading || !agreeToPolicies}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </motion.div>
  );
};

export default AuthPage;
