
import React, { useState, useEffect } from 'react';
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
import { User, Store, MapPin, Clock, CreditCard, LogOut } from 'lucide-react';
import { Merchant, User as UserType, BankInfo } from '@/types';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  
  const { toast } = useToast();
  const { userId, logout } = useAuth();

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (userError) throw userError;
        
        // Fetch merchant data
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (merchantError && merchantError.code !== 'PGRST116') {
          throw merchantError;
        }
        
        // Fetch bank info if merchant exists
        let bankData = null;
        if (merchantData) {
          const { data: bankInfoData, error: bankError } = await supabase
            .from('bank_info')
            .select('*')
            .eq('merchant_id', merchantData.id)
            .single();
            
          if (bankError && bankError.code !== 'PGRST116') {
            throw bankError;
          }
          
          if (bankInfoData) {
            bankData = bankInfoData;
            setAccountName(bankInfoData.account_holder_name);
            setAccountNumber(bankInfoData.account_number);
            setIfscCode(bankInfoData.ifsc_code);
            setBankName(bankInfoData.bank_name);
            setUpiId(bankInfoData.upi_id || '');
          }
        }
        
        // Set state
        setUser(userData as UserType);
        setMerchant(merchantData as Merchant);
        setBankInfo(bankData as BankInfo);
        
        // Set form fields
        setName(userData.name);
        setEmail(userData.email);
        setPhone(userData.phone || '');
        
        if (merchantData) {
          setShopName(merchantData.shop_name);
          setDescription(merchantData.description || '');
          setCategory(merchantData.category);
          setOpenTime(merchantData.open_time);
          setCloseTime(merchantData.close_time);
        }
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
    
    fetchUserData();
  }, [userId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSavingProfile(true);
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
      setIsSavingProfile(false);
    }
  };

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchant) {
      toast({
        title: "Error",
        description: "Merchant information not found. Please complete onboarding first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingBusiness(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({
          shop_name: shopName,
          description,
          category,
          open_time: openTime,
          close_time: closeTime
        })
        .eq('id', merchant.id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Your business information has been updated.",
      });
      
      // Update local state
      setMerchant(prev => prev ? {
        ...prev,
        shop_name: shopName,
        description,
        category,
        open_time: openTime,
        close_time: closeTime
      } : null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update business information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const handleUpdateBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchant) {
      toast({
        title: "Error",
        description: "Merchant information not found. Please complete onboarding first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingBank(true);
    try {
      if (bankInfo) {
        // Update existing bank info
        const { error } = await supabase
          .from('bank_info')
          .update({
            account_holder_name: accountName,
            account_number: accountNumber,
            ifsc_code: ifscCode,
            bank_name: bankName,
            upi_id: upiId || null
          })
          .eq('id', bankInfo.id);
          
        if (error) throw error;
      } else {
        // Create new bank info
        const { error } = await supabase
          .from('bank_info')
          .insert({
            merchant_id: merchant.id,
            account_holder_name: accountName,
            account_number: accountNumber,
            ifsc_code: ifscCode,
            bank_name: bankName,
            upi_id: upiId || null
          });
          
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Your bank information has been updated.",
      });
      
      // Update local state
      setBankInfo({
        id: bankInfo?.id || '',
        merchant_id: merchant.id,
        account_holder_name: accountName,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        bank_name: bankName,
        upi_id: upiId || null
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update bank information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingBank(false);
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
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Merchant Profile</h1>
        <p className="text-booqit-dark/70">Manage your personal and business information</p>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
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
                        disabled={isSavingProfile}
                      >
                        {isSavingProfile ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="business">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!merchant ? (
                      <div className="text-center py-6">
                        <Store className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                        <p className="text-booqit-dark/70 mb-4">Your business information is not set up yet</p>
                        <Button 
                          onClick={() => window.location.href = '/merchant/onboarding'}
                          className="bg-booqit-primary"
                        >
                          Complete Onboarding
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleUpdateBusiness} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="shopName">Shop Name</Label>
                            <Input 
                              id="shopName" 
                              value={shopName} 
                              onChange={(e) => setShopName(e.target.value)} 
                              required 
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input 
                              id="category" 
                              value={category} 
                              onChange={(e) => setCategory(e.target.value)} 
                              required 
                            />
                          </div>
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea 
                              id="description" 
                              value={description} 
                              onChange={(e) => setDescription(e.target.value)} 
                              rows={3} 
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="openTime">Opening Time</Label>
                            <Input 
                              id="openTime" 
                              type="time"
                              value={openTime} 
                              onChange={(e) => setOpenTime(e.target.value)} 
                              required 
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="closeTime">Closing Time</Label>
                            <Input 
                              id="closeTime" 
                              type="time"
                              value={closeTime} 
                              onChange={(e) => setCloseTime(e.target.value)} 
                              required 
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="bg-booqit-primary"
                          disabled={isSavingBusiness}
                        >
                          {isSavingBusiness ? "Saving..." : "Save Changes"}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="bank">
                <Card>
                  <CardHeader>
                    <CardTitle>Bank Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!merchant ? (
                      <div className="text-center py-6">
                        <CreditCard className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                        <p className="text-booqit-dark/70 mb-4">Set up your business information first</p>
                        <Button 
                          onClick={() => window.location.href = '/merchant/onboarding'}
                          className="bg-booqit-primary"
                        >
                          Complete Onboarding
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleUpdateBankInfo} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="accountName">Account Holder Name</Label>
                            <Input 
                              id="accountName" 
                              value={accountName} 
                              onChange={(e) => setAccountName(e.target.value)} 
                              required 
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input 
                              id="accountNumber" 
                              value={accountNumber} 
                              onChange={(e) => setAccountNumber(e.target.value)} 
                              required 
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="ifscCode">IFSC Code</Label>
                            <Input 
                              id="ifscCode" 
                              value={ifscCode} 
                              onChange={(e) => setIfscCode(e.target.value)} 
                              required 
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input 
                              id="bankName" 
                              value={bankName} 
                              onChange={(e) => setBankName(e.target.value)} 
                              required 
                            />
                          </div>
                          
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="upiId">UPI ID (Optional)</Label>
                            <Input 
                              id="upiId" 
                              value={upiId} 
                              onChange={(e) => setUpiId(e.target.value)} 
                              placeholder="yourname@upi"
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="bg-booqit-primary"
                          disabled={isSavingBank}
                        >
                          {isSavingBank ? "Saving..." : "Save Changes"}
                        </Button>
                      </form>
                    )}
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
