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
  const redirectExecuted = useRef(false);
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

  // Enhanced email validation
  const validateEmail = (email: string): boolean => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmedEmail) && trimmedEmail.length > 0;
  };

  // Enhanced phone validation
  const validatePhone = (phone: string): boolean => {
    if (!phone || phone.trim() === '') return true; // Phone is optional
    const cleanPhone = phone.replace(/\s/g, '');
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
  };

  // Clear errors when user starts typing
  const clearError = (field: string) => {
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Enhanced form validation
  const validateForm = (isLogin: boolean = false): boolean => {
    const newErrors: typeof errors = {};
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    // Email validation
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(trimmedEmail)) {
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
      if (!trimmedName) {
        newErrors.name = 'Full name is required';
      } else if (trimmedName.length < 2) {
        newErrors.name = 'Name must be at least 2 characters long';
      }

      if (trimmedPhone && !validatePhone(trimmedPhone)) {
        newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Simplified registration with essential database operations only
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      console.log('📝 Starting simplified registration process...');
      
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

      // Step 1: Create the user account with essential metadata only
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
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
          setErrors({ general: "Failed to create account. Please try again." });
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

      // Step 2: Create profile record with only essential fields
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          role: selectedRole,
          notification_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError);
        setErrors({ general: 'Failed to create user profile. Please try again.' });
        setIsLoading(false);
        return;
      }

      console.log('✅ Profile created successfully');

      // Step 3: Create merchant record and shop URL if needed
      if (selectedRole === 'merchant') {
        console.log('🏪 Creating merchant record...');
        
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .insert({
            user_id: authData.user.id,
            shop_name: `${name.trim()}'s Shop`,
            address: '',
            category: 'salon',
            gender_focus: 'unisex',
            lat: 0,
            lng: 0,
            open_time: '09:00',
            close_time: '18:00',
            description: '',
          })
          .select()
          .single();

        if (merchantError) {
          console.error('❌ Merchant record creation error:', merchantError);
          // Don't fail registration for merchant setup errors
          console.log('⚠️ Merchant setup can be completed later');
        } else {
          console.log('✅ Merchant record created');
          
          // Step 3.1: Create shop URL for the merchant
          console.log('🔗 Creating shop URL...');
          
          // Generate shop slug from shop name
          const generateSlug = (name: string): string => {
            return name
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
              .replace(/\s+/g, '-') // Replace spaces with hyphens
              .replace(/-+/g, '-') // Replace multiple hyphens with single
              .trim()
              .substring(0, 50); // Limit length
          };

          const baseSlug = generateSlug(`${name.trim()}'s Shop`);
          let shopSlug = baseSlug;
          let counter = 1;

          // Ensure unique slug
          while (true) {
            const { data: existingSlug } = await supabase
              .from('shop_urls')
              .select('id')
              .eq('shop_slug', shopSlug)
              .single();

            if (!existingSlug) break;
            
            shopSlug = `${baseSlug}-${counter}`;
            counter++;
          }

          const { error: shopUrlError } = await supabase
            .from('shop_urls')
            .insert({
              merchant_id: merchantData.id,
              shop_slug: shopSlug,
              is_active: true
            });

          if (shopUrlError) {
            console.error('❌ Shop URL creation error:', shopUrlError);
            // Don't fail registration for shop URL errors
            console.log('⚠️ Shop URL can be created later');
          } else {
            console.log('✅ Shop URL created:', shopSlug);
          }
        }
      }

      // Step 4: Handle successful registration
      if (authData.session) {
        console.log('✅ Registration successful with session');
        
        PermanentSession.saveSession({
          userId: authData.user.id,
          email: authData.user.email || '',
          userRole: selectedRole,
          isLoggedIn: true,
          session: authData.session
        });
        
        setAuth(true, selectedRole, authData.user.id);
        
        redirectExecuted.current = true;
        if (selectedRole === 'merchant') {
          navigate('/merchant/onboarding', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }

        toast({
          title: "Welcome to BooqIt!",
          description: "Your account has been created successfully.",
        });
      } else {
        console.log('📧 Email confirmation may be required');
        toast({
          title: "Check your email",
          description: "Please check your email to confirm your account before logging in.",
        });
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      setErrors({ general: 'Failed to create account. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced login with better error handling and direct navigation
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      console.log('🔐 Attempting login...');
      
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin(e as any);
    }
  };

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
