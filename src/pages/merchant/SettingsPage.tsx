
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Merchant, BankInfo } from '@/types';
import { LogOut, Shield, Settings, Camera, Upload } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SettingsPage: React.FC = () => {
  const { toast } = useToast();
  const { userId, logout } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form states
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [address, setAddress] = useState('');
  const [shopImage, setShopImage] = useState<File | null>(null);
  const [shopImageUrl, setShopImageUrl] = useState<string | null>(null);
  
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);

  useEffect(() => {
    const fetchMerchantData = async () => {
      if (!userId) return;
      
      try {
        setIsLoading(true);
        // Fetch merchant data
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (merchantError) {
          console.error('Error fetching merchant data:', merchantError);
          return;
        }
        
        if (merchantData) {
          setMerchant(merchantData);
          setShopName(merchantData.shop_name);
          setDescription(merchantData.description || '');
          setCategory(merchantData.category);
          setOpenTime(merchantData.open_time);
          setCloseTime(merchantData.close_time);
          setAddress(merchantData.address);
          setShopImageUrl(merchantData.image_url);
          
          // Fetch bank info
          const { data: bankData, error: bankError } = await supabase
            .from('bank_info')
            .select('*')
            .eq('merchant_id', merchantData.id)
            .single();
            
          if (!bankError && bankData) {
            setBankInfo(bankData);
            setAccountHolderName(bankData.account_holder_name);
            setAccountNumber(bankData.account_number);
            setBankName(bankData.bank_name);
            setIfscCode(bankData.ifsc_code);
            setUpiId(bankData.upi_id || '');
          }
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: 'Error',
          description: 'Failed to load merchant data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMerchantData();
  }, [userId]);

  const handleUpdateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchant) {
      toast({
        title: 'Error',
        description: 'Merchant data not found',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      let imageUrl = shopImageUrl;

      // If there's a new image to upload
      if (shopImage) {
        setIsUploading(true);
        // Create a unique file name
        const fileExt = shopImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `merchants/${merchant.id}/${fileName}`;
        
        // Upload the image to supabase storage
        const { error: uploadError, data } = await supabase
          .storage
          .from('images')
          .upload(filePath, shopImage);
          
        if (uploadError) {
          throw uploadError;
        }
        
        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase
          .storage
          .from('images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
        setIsUploading(false);
      }
      
      const { error } = await supabase
        .from('merchants')
        .update({
          shop_name: shopName,
          description: description,
          category: category,
          open_time: openTime,
          close_time: closeTime,
          address: address,
          image_url: imageUrl
        })
        .eq('id', merchant.id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Merchant information updated successfully',
      });
      
      // Update local state
      setMerchant(prev => {
        if (!prev) return null;
        return {
          ...prev,
          shop_name: shopName,
          description: description,
          category: category,
          open_time: openTime,
          close_time: closeTime,
          address: address,
          image_url: imageUrl
        };
      });
      
      setShopImageUrl(imageUrl);
      setShopImage(null);
      
    } catch (error) {
      console.error('Error updating merchant:', error);
      toast({
        title: 'Error',
        description: 'Failed to update merchant information',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchant) {
      toast({
        title: 'Error',
        description: 'Merchant data not found',
        variant: 'destructive',
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
            account_holder_name: accountHolderName,
            account_number: accountNumber,
            bank_name: bankName,
            ifsc_code: ifscCode,
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
            account_holder_name: accountHolderName,
            account_number: accountNumber,
            bank_name: bankName,
            ifsc_code: ifscCode,
            upi_id: upiId || null
          });
          
        if (error) throw error;
      }
      
      toast({
        title: 'Success',
        description: 'Bank information updated successfully',
      });
    } catch (error) {
      console.error('Error updating bank info:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bank information',
        variant: 'destructive',
      });
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Only accept image files
      if (file.type.startsWith('image/')) {
        setShopImage(file);
      } else {
        sonnerToast.error('Please select an image file');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Error',
        description: 'Failed to logout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your shop and account settings</p>
        </div>
        
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
      
      <Tabs defaultValue="business">
        <TabsList className="mb-4">
          <TabsTrigger value="business">Business Information</TabsTrigger>
          <TabsTrigger value="banking">Banking Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateMerchant} className="space-y-6">
                {/* Shop Image */}
                <div className="space-y-2">
                  <Label htmlFor="image">Shop Image</Label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="w-32 h-32 rounded-lg bg-gray-100 overflow-hidden border flex items-center justify-center">
                      {(shopImageUrl || shopImage) ? (
                        <img 
                          src={shopImage ? URL.createObjectURL(shopImage) : shopImageUrl || ''} 
                          alt="Shop preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 w-full max-w-md">
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={() => document.getElementById('shop-image-upload')?.click()}
                          className="flex items-center gap-2"
                          disabled={isUploading}
                        >
                          <Upload className="h-4 w-4" />
                          {shopImage ? 'Change Image' : 'Upload Image'}
                        </Button>
                        
                        {shopImage && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            className="text-destructive"
                            onClick={() => setShopImage(null)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                      
                      {shopImage && (
                        <p className="text-sm text-muted-foreground">{shopImage.name}</p>
                      )}
                      
                      <input 
                        type="file" 
                        id="shop-image-upload" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="hidden" 
                      />
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: Square image, at least 500x500px
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shopName">Shop Name</Label>
                    <Input 
                      id="shopName"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Enter your shop name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Business Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Salon">Salon</SelectItem>
                        <SelectItem value="Spa">Spa</SelectItem>
                        <SelectItem value="Barber">Barber</SelectItem>
                        <SelectItem value="Massage">Massage</SelectItem>
                        <SelectItem value="Nail Salon">Nail Salon</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Business Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your services and specialties"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tell customers what makes your business special
                    </p>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your business address"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="openTime">Opening Time</Label>
                    <Input
                      type="time"
                      id="openTime"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="closeTime">Closing Time</Label>
                    <Input
                      type="time"
                      id="closeTime"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    className="bg-booqit-primary"
                    disabled={isSaving || isUploading}
                  >
                    {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="banking">
          <Card>
            <CardHeader>
              <CardTitle>Banking Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Shield className="h-5 w-5" />
                <AlertDescription>
                  Your banking information is encrypted and stored securely. We only use this information to process your payments.
                </AlertDescription>
              </Alert>
              
              <form onSubmit={handleUpdateBankInfo} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input 
                      id="accountHolderName"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Enter account holder's name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input 
                      id="accountNumber"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Enter bank account number"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input 
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Enter your bank name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input 
                      id="ifscCode"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      placeholder="Enter IFSC code"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      The IFSC code is an 11-character code that identifies your bank branch
                    </p>
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
                
                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    className="bg-booqit-primary"
                    disabled={isSavingBank}
                  >
                    {isSavingBank ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
