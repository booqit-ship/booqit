
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Store, MapPin, Clock, CreditCard, LogOut, Loader2 } from 'lucide-react';
import { Merchant, User as UserType, BankInfo } from '@/types';
import ProfilePersonalForm from '@/components/merchant/profile/ProfilePersonalForm';
import ProfileBusinessForm from '@/components/merchant/profile/ProfileBusinessForm';
import ProfileBankForm from '@/components/merchant/profile/ProfileBankForm';

// Data fetching functions
async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data as UserType;
}

async function fetchMerchantData(userId: string) {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data as Merchant | null;
}

async function fetchBankInfo(merchantId: string) {
  const { data, error } = await supabase
    .from('bank_info')
    .select('*')
    .eq('merchant_id', merchantId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data as BankInfo | null;
}

const ProfilePage: React.FC = () => {
  const { toast } = useToast();
  const { userId, logout } = useAuth();

  // Fetch user profile with caching
  const { data: user, isFetching: isUserFetching } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch merchant data with caching
  const { data: merchant, isFetching: isMerchantFetching } = useQuery({
    queryKey: ['merchant-profile', userId],
    queryFn: () => fetchMerchantData(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch bank info with caching
  const { data: bankInfo, isFetching: isBankFetching } = useQuery({
    queryKey: ['bank-info', merchant?.id],
    queryFn: () => fetchBankInfo(merchant!.id),
    enabled: !!merchant?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });

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

  // Show cached data immediately, even if fetching
  const isInitialLoad = !user && isUserFetching;

  if (isInitialLoad) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-booqit-dark">Merchant Profile</h1>
          {(isUserFetching || isMerchantFetching || isBankFetching) && (
            <Loader2 className="h-4 w-4 animate-spin text-booqit-primary" />
          )}
        </div>
        <p className="text-booqit-dark/70">Manage your personal and business information</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-booqit-primary/20 flex items-center justify-center mb-4">
                  {merchant ? (
                    <Store className="h-12 w-12 text-booqit-primary" />
                  ) : (
                    <User className="h-12 w-12 text-booqit-primary" />
                  )}
                </div>
                <h2 className="text-xl font-semibold">{merchant?.shop_name || user?.name}</h2>
                <p className="text-booqit-dark/60 text-sm">{merchant?.category || 'Merchant'}</p>
                
                <Separator className="my-4" />
                
                {merchant && (
                  <div className="w-full space-y-2 mb-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-booqit-dark/60 mr-2" />
                      <span className="text-sm">{merchant.address}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-booqit-dark/60 mr-2" />
                      <span className="text-sm">{merchant.open_time} - {merchant.close_time}</span>
                    </div>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
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
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="business">Business Info</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal">
              <ProfilePersonalForm user={user} isFetching={isUserFetching} />
            </TabsContent>
            
            <TabsContent value="business">
              <ProfileBusinessForm merchant={merchant} isFetching={isMerchantFetching} />
            </TabsContent>
            
            <TabsContent value="bank">
              <ProfileBankForm 
                merchant={merchant} 
                bankInfo={bankInfo} 
                isFetching={isBankFetching} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
