
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const AuthPage: React.FC = () => {
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
  const { setAuth } = useAuth();

  // Handle login with Supabase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check user role from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const userRole = profileData?.role as UserRole;
      
      // Set auth state
      setAuth(true, userRole, data.user.id);
      
      // Navigate to appropriate dashboard
      if (userRole === 'merchant') {
        navigate('/merchant/onboarding');
      } else {
        navigate('/');
      }

      toast({
        title: "Success!",
        description: "You have been logged in successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error!",
        description: error.message || "Failed to login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration with Supabase
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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

      // Set auth state
      setAuth(true, selectedRole as UserRole, data.user?.id);
      
      // Navigate to appropriate dashboard
      if (selectedRole === 'merchant') {
        navigate('/merchant/onboarding');
      } else {
        navigate('/');
      }

      toast({
        title: "Success!",
        description: "Your account has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error!",
        description: error.message || "Failed to create account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setIsRoleSelected(true);
    
    // Store selected role for future reference
    localStorage.setItem('booqit_selected_role', role);
  };
  
  // If role is not selected, show role selection screen
  if (!isRoleSelected) {
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
                onClick={() => setIsRoleSelected(false)}
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
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-xs p-0 h-auto font-poppins"
                      >
                        Forgot password?
                      </Button>
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
                  
                  {/* Privacy Policy and Terms Agreement */}
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
