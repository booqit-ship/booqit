
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Merchant, BankInfo } from '@/types';
import { LogOut, Settings } from 'lucide-react';
import SettingsBusinessForm from '@/components/merchant/SettingsBusinessForm';
import SettingsBankingForm from '@/components/merchant/SettingsBankingForm';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface SqlResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const SettingsPage: React.FC = () => {
  const { userId, logout } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form states
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [genderFocus, setGenderFocus] = useState('unisex');
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
          setGenderFocus(merchantData.gender_focus || 'unisex');
          // Store times in 24-hour format for HTML time inputs
          setOpenTime(merchantData.open_time || '');
          setCloseTime(merchantData.close_time || '');
          setAddress(merchantData.address);
          setShopImageUrl(merchantData.image_url);
          
          console.log('Loaded merchant hours:', {
            open_time: merchantData.open_time,
            close_time: merchantData.close_time
          });
          
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
        toast('Failed to load merchant data', {
          description: 'Please try again later',
          style: { backgroundColor: 'red', color: 'white' }
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMerchantData();
  }, [userId]);

  const generateSlotsForNext30Days = async (merchantId: string) => {
    try {
      console.log('Starting slot generation for next 30 days...');
      // Generate slots for the next 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        console.log(`Generating slots for date: ${dateStr}`);
        
        // Call the generate_stylist_slots function
        const { error } = await supabase.rpc('generate_stylist_slots', {
          p_merchant_id: merchantId,
          p_date: dateStr
        });
        
        if (error) {
          console.error(`Error generating slots for ${dateStr}:`, error);
        }
      }
      console.log('Successfully generated slots for next 30 days');
    } catch (error) {
      console.error('Error in slot generation:', error);
    }
  };

  const handleUpdateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchant || !userId) {
      toast('Error', {
        description: 'Merchant data not found',
        style: { backgroundColor: 'red', color: 'white' }
      });
      return;
    }
    
    if (!openTime || !closeTime) {
      toast('Error', {
        description: 'Please select both opening and closing times',
        style: { backgroundColor: 'red', color: 'white' }
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      let imageUrl = shopImageUrl;

      // If there's a new image to upload
      if (shopImage) {
        setIsUploading(true);
        
        // Create a unique file path with user ID as folder
        const fileExt = shopImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        
        // Upload the image to supabase storage
        const { error: uploadError } = await supabase
          .storage
          .from('merchant_images')
          .upload(filePath, shopImage);
          
        if (uploadError) {
          throw uploadError;
        }
        
        // Get the public URL for the uploaded image
        const { data: { publicUrl } } = supabase
          .storage
          .from('merchant_images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
        setIsUploading(false);
      }
      
      console.log('Updating merchant with times:', { openTime, closeTime });
      
      // Use the SQL function to update merchant hours
      const { data: hoursResult, error: hoursError } = await supabase.rpc('update_merchant_hours', {
        p_merchant_id: merchant.id,
        p_open_time: openTime,
        p_close_time: closeTime
      });

      if (hoursError) {
        console.error('Error updating hours:', hoursError);
        throw hoursError;
      }

      const hoursResponse = hoursResult as unknown as SqlResponse;
      if (!hoursResponse.success) {
        throw new Error(hoursResponse.error || 'Failed to update hours');
      }
      
      console.log('Hours updated successfully');
      
      // Update other merchant fields
      const { error } = await supabase
        .from('merchants')
        .update({
          shop_name: shopName,
          description: description,
          category: category,
          gender_focus: genderFocus,
          address: address,
          image_url: imageUrl
        })
        .eq('id', merchant.id);
        
      if (error) throw error;
      
      // Generate slots for the next 30 days after updating hours
      await generateSlotsForNext30Days(merchant.id);
      
      toast('Business information updated', {
        description: 'Your changes have been saved successfully and booking slots have been generated'
      });
      
      // Update local state with the new values
      setMerchant(prev => {
        if (!prev) return null;
        return {
          ...prev,
          shop_name: shopName,
          description: description,
          category: category,
          gender_focus: genderFocus,
          open_time: openTime,
          close_time: closeTime,
          address: address,
          image_url: imageUrl
        };
      });
      
      setShopImageUrl(imageUrl);
      setShopImage(null);
      
    } catch (error: any) {
      console.error('Error updating merchant:', error);
      toast('Update failed', {
        description: error.message || 'Failed to update business information',
        style: { backgroundColor: 'red', color: 'white' }
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    // Banking updates are now disabled in the UI
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
      toast('Logout failed', {
        description: 'Failed to logout. Please try again.',
        style: { backgroundColor: 'red', color: 'white' }
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
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-booqit-primary" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <p className="text-muted-foreground text-lg">Manage your shop preferences and account settings</p>
        <Separator className="my-4" />
      </div>
      
      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="w-full max-w-md justify-start mb-6 h-12 p-1">
          <TabsTrigger className="flex-1 h-10 text-base" value="business">Business Information</TabsTrigger>
          <TabsTrigger className="flex-1 h-10 text-base" value="banking">Banking Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="business" className="space-y-6">
          <SettingsBusinessForm 
            merchant={merchant}
            isLoading={isLoading}
            isSaving={isSaving}
            isUploading={isUploading}
            onSave={handleUpdateMerchant}
            shopName={shopName}
            setShopName={setShopName}
            description={description}
            setDescription={setDescription}
            category={category}
            setCategory={setCategory}
            genderFocus={genderFocus}
            setGenderFocus={setGenderFocus}
            openTime={openTime}
            setOpenTime={setOpenTime}
            closeTime={closeTime}
            setCloseTime={setCloseTime}
            address={address}
            setAddress={setAddress}
            shopImage={shopImage}
            setShopImage={setShopImage}
            shopImageUrl={shopImageUrl}
          />
        </TabsContent>
        
        <TabsContent value="banking" className="space-y-6">
          <SettingsBankingForm 
            bankInfo={bankInfo}
            isSavingBank={isSavingBank}
            onSave={handleUpdateBankInfo}
            accountHolderName={accountHolderName}
            setAccountHolderName={setAccountHolderName}
            accountNumber={accountNumber}
            setAccountNumber={setAccountNumber}
            bankName={bankName}
            setBankName={setBankName}
            ifscCode={ifscCode}
            setIfscCode={setIfscCode}
            upiId={upiId}
            setUpiId={setUpiId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
