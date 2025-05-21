
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { User as UserIcon, Phone, Mail, LogOut, Star, Clock } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { userId, logout } = useAuth();

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) throw error;
        
        setUser(data as User);
        setName(data.name);
        setEmail(data.email);
        setPhone(data.phone || '');
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch your profile. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [userId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          phone
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Your profile has been updated.",
      });
      
      // Update local state
      setUser(prev => prev ? { ...prev, name, phone } : null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Your Profile</h1>
        <p className="text-booqit-dark/70">Manage your account and preferences</p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-booqit-primary/20 flex items-center justify-center mb-4">
                    <UserIcon className="h-12 w-12 text-booqit-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">{user?.name}</h2>
                  <p className="text-booqit-dark/60 text-sm">{user?.role}</p>
                  
                  <Separator className="my-4" />
                  
                  <div className="w-full space-y-2">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-booqit-dark/60 mr-2" />
                      <span className="text-sm">{user?.email}</span>
                    </div>
                    {user?.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-booqit-dark/60 mr-2" />
                        <span className="text-sm">{user?.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="mt-6 w-full"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-3">
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="account">Account Settings</TabsTrigger>
                <TabsTrigger value="history">Booking History</TabsTrigger>
                <TabsTrigger value="reviews">Your Reviews</TabsTrigger>
              </TabsList>
              
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input 
                            id="name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            value={email} 
                            disabled
                            className="bg-gray-50" 
                          />
                          <p className="text-xs text-booqit-dark/60">
                            Email cannot be changed
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                          />
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="bg-booqit-primary"
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <div className="py-6 px-4 text-center">
                        <Clock className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                        <p className="text-booqit-dark/60">Your booking history will appear here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <div className="py-6 px-4 text-center">
                        <Star className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                        <p className="text-booqit-dark/60">Your reviews will appear here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
