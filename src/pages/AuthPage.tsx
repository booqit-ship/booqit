import React, { useState, useEffect } from 'react';
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
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isRoleSelected, setIsRoleSelected] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeToPolicies, setAgreeToPolicies] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    const permanentData = PermanentSession.getSession();
    
    if (permanentData.isLoggedIn) {
      console.log('🔄 User has permanent session, redirecting...', { userRole: permanentData.userRole });
      if (permanentData.userRole === 'merchant') {
        navigate('/merchant', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
      return;
    }

    if (!loading && isAuthenticated && userRole) {
      console.log('🔄 User authenticated via context, redirecting...', { userRole });
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

  // Enhanced login with immediate session validation
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('🔐 Attempting login...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session && data.user) {
        console.log('✅ Login successful, session created');
        
        // Immediate validation of the new session
        console.log('🔍 Validating new session immediately');
        const isValid = await validateCurrentSession();
        
        if (!isValid) {
          throw new Error('Session validation failed after login');
        }
        
        // Fetch user role from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('❌ Error fetching user profile:', profileError);
          throw new Error('Failed to fetch user profile');
        }

        const userRole = profileData?.role as UserRole;
        console.log('👤 User role fetched:', userRole);
        
        // Save permanent session with validated data
        PermanentSession.saveSession(data.session, userRole, data.user.id);
        
        // Update auth context
        setAuth(true, userRole, data.user.id);
        
        console.log('🎯 Navigating after login...');
        if (userRole === 'merchant') {
          navigate('/merchant', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }

        toast({
          title: "Success!",
          description: "You have been logged in successfully.",
        });
      } else {
        throw new Error('No session created during login');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      toast({
        title: "Error!",
        description: error.message || "Failed to login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced registration with immediate session validation
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('📝 Attempting registration...');
      
      if (!email || !password || !name) {
        throw new Error("Please fill in all required fields");
      }

      if (!agreeToPolicies) {
        throw new Error("Please agree to the Privacy Policy and Terms and Conditions to continue");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role: selectedRole,
          }
        }
      });

      if (error) throw error;

      if (data.session && data.user) {
        console.log('✅ Registration successful, session created');
        
        // Immediate validation of the new session
        console.log('🔍 Validating new registration session immediately');
        const isValid = await validateCurrentSession();
        
        if (!isValid) {
          console.log('⚠️ Session validation failed after registration, but continuing');
        }
        
        // Save permanent session immediately
        PermanentSession.saveSession(data.session, selectedRole as UserRole, data.user.id);
        
        // Update auth context
        setAuth(true, selectedRole as UserRole, data.user.id);
        
        console.log('🎯 Navigating after registration...');
        if (selectedRole === 'merchant') {
          navigate('/merchant/onboarding', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }

        toast({
          title: "Success!",
          description: "Your account has been created successfully.",
        });
      } else if (data.user && !data.session) {
        // Email confirmation required
        console.log('📧 Email confirmation required');
        toast({
          title: "Check your email",
          description: "Please check your email to confirm your account.",
        });
      } else {
        throw new Error('Registration failed - no user created');
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      toast({
        title: "Error!",
        description: error.message || "Failed to create account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
          <CardHeader className="pb-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-poppins">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="font-poppins"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="font-poppins">Password</Label>
                      <Link to="/forgot-password">
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-xs p-0 h-auto font-poppins text-booqit-primary hover:text-booqit-primary/80"
                        >
                          Forgot password?
                        </Button>
                      </Link>
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="font-poppins"
                      required
                    />
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
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-poppins">Full Name</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="Your Name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="font-poppins"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-poppins">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="font-poppins"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-poppins">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="+91 XXXXXXXXXX" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="font-poppins"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="font-poppins">Password</Label>
                    <Input 
                      id="new-password" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="font-poppins"
                      required
                    />
                  </div>
                  
                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox
                      id="agree-policies"
                      checked={agreeToPolicies}
                      onCheckedChange={(checked) => setAgreeToPolicies(checked as boolean)}
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
