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

const AuthPage: React.FC = () => {
  const location = useLocation();
  const hasRedirected = useRef(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isRoleSelected, setIsRoleSelected] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeToPolicies, setAgreeToPolicies] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
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

  // Redirect authenticated users immediately using permanent session
  useEffect(() => {
    if (hasRedirected.current) return; // Prevent double navigation

    const permanentData = PermanentSession.getSession();
    
    if (permanentData.isLoggedIn) {
      console.log('🔄 User has permanent session, redirecting...', { userRole: permanentData.userRole });
      hasRedirected.current = true;
      if (permanentData.userRole === 'merchant') {
        navigate('/merchant', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
      return;
    }

    if (!loading && isAuthenticated && userRole) {
      console.log('🔄 User authenticated via context, redirecting...', { userRole });
      hasRedirected.current = true;
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

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation function
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Phone is optional
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Clear errors when user starts typing
  const clearError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate form fields
  const validateForm = (isLogin: boolean = false): boolean => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!isLogin && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Registration-specific validations
    if (!isLogin) {
      if (!name.trim()) {
        newErrors.name = 'Full name is required';
      }

      if (phone && !validatePhone(phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enhanced registration with proper profile creation
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      console.log('📝 Starting registration process...', { email, selectedRole });
      
      // Validate form
      if (!validateForm(false)) {
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

      // Step 1: Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim(),
            role: selectedRole,
          }
        }
      });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        
        if (authError.message?.includes('User already registered')) {
          setErrors({ email: "An account with this email already exists. Please try logging in instead." });
        } else if (authError.message?.includes('Invalid email')) {
          setErrors({ email: "Please enter a valid email address." });
        } else if (authError.message?.includes('Password')) {
          setErrors({ password: authError.message });
        } else {
          setErrors({ general: authError.message || "Failed to create account. Please try again." });
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setErrors({ general: 'Failed to create user account' });
        setIsLoading(false);
        return;
      }

      console.log('✅ User account created:', authData.user.id);

      // Step 2: Create/update profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          role: selectedRole,
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError);
        // Don't throw here, profile might be created by trigger
        console.log('⚠️ Profile creation failed, but continuing (might be created by trigger)');
      } else {
        console.log('✅ Profile created successfully');
      }

      // Step 3: If merchant role, create basic merchant record (will be completed in onboarding)
      if (selectedRole === 'merchant') {
        console.log('🏪 Creating basic merchant record for onboarding...');
        
        // Create minimal merchant record - will be completed during onboarding
        const { error: merchantError } = await supabase
          .from('merchants')
          .insert({
            user_id: authData.user.id,
            shop_name: `${name.trim()}'s Shop`, // Temporary name
            address: '', // Will be filled during onboarding
            category: 'salon', // Default category
            lat: 0, // Will be updated during onboarding
            lng: 0,
            open_time: '09:00',
            close_time: '18:00',
            description: '',
          });

        if (merchantError) {
          console.error('❌ Basic merchant record creation error:', merchantError);
          // Don't throw here, onboarding can handle creating the record if needed
          console.log('⚠️ Basic merchant record creation failed, onboarding will handle it');
        } else {
          console.log('✅ Basic merchant record created for onboarding');
        }
      }

      // Step 4: Handle session and navigation
      if (authData.session && authData.user) {
        console.log('✅ Registration successful with session');
        
        // Save permanent session with correct method signature
        PermanentSession.saveSession(authData.session, selectedRole, authData.user.id);
        
        // Update auth context
        setAuth(true, selectedRole, authData.user.id);
        
        console.log('🎯 Navigating after registration...');
        if (selectedRole === 'merchant') {
          // Always go to onboarding for new merchants
          navigate('/merchant/onboarding', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }

        toast({
          title: "Welcome to BooqIt!",
          description: "Your account has been created successfully.",
        });
      } else if (authData.user && !authData.session) {
        // Email confirmation required
        console.log('📧 Email confirmation required');
        toast({
          title: "Check your email",
          description: "Please check your email to confirm your account before logging in.",
        });
      } else {
        setErrors({ general: 'Registration failed - no user created' });
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      setErrors({ general: error.message || "Failed to create account. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced login with better error handling
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      console.log('🔐 Attempting login...');
      
      // Validate form
      if (!validateForm(true)) {
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
        
        // Immediate validation of the new session
        console.log('🔍 Validating new session immediately');
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
        
        // Save permanent session with validated data using correct method signature
        PermanentSession.saveSession(data.session, userRole, data.user.id);
        
        // Update auth context
        setAuth(true, userRole, data.user.id);
        
        console.log('🎯 Navigating after login...');
        if (userRole === 'merchant') {
          // Check if merchant needs onboarding
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

  // Handle keyboard events for mobile form submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin(e as any);
    }
  };

  // Handle forgot password navigation with explicit prevention
  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/forgot-password');
  };

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
                    <Input 
                      id="password" 
                      type="password" 
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError('password');
                      }}
                      onKeyDown={handleKeyDown}
                      className={`font-poppins ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                      required
                      disabled={isLoading}
                    />
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
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="+91 XXXXXXXXXX" 
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearError('phone');
                      }}
                      className={`font-poppins ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="font-poppins">Password *</Label>
                    <Input 
                      id="new-password" 
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError('password');
                      }}
                      className={`font-poppins ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600">{errors.password}</p>
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
