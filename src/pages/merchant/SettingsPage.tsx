import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Merchant, BankInfo } from '@/types';
import { LogOut, Settings, Mail, Info, Shield, FileText, Trash2, ChevronRight, User, CreditCard } from 'lucide-react';
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
  const { userId, logout, user } = useAuth();
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
        const {
          data: merchantData,
          error: merchantError
        } = await supabase.from('merchants').select('*').eq('user_id', userId).single();
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
          setOpenTime(merchantData.open_time || '');
          setCloseTime(merchantData.close_time || '');
          setAddress(merchantData.address);
          setShopImageUrl(merchantData.image_url);

          // Fetch bank info
          const {
            data: bankData,
            error: bankError
          } = await supabase.from('bank_info').select('*').eq('merchant_id', merchantData.id).single();
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
          style: {
            backgroundColor: 'red',
            color: 'white'
          }
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
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        console.log(`Generating slots for date: ${dateStr}`);

        const {
          data,
          error
        } = await supabase.rpc('get_fresh_available_slots', {
          p_merchant_id: merchantId,
          p_date: dateStr,
          p_staff_id: null
        });
        if (error) {
          console.error(`Error generating slots for ${dateStr}:`, error);
        } else {
          console.log(`Slots generated for ${dateStr}`);
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
        style: {
          backgroundColor: 'red',
          color: 'white'
        }
      });
      return;
    }
    if (!openTime || !closeTime) {
      toast('Error', {
        description: 'Please select both opening and closing times',
        style: {
          backgroundColor: 'red',
          color: 'white'
        }
      });
      return;
    }
    setIsSaving(true);
    try {
      let imageUrl = shopImageUrl;

      if (shopImage) {
        setIsUploading(true);

        const fileExt = shopImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const {
          error: uploadError
        } = await supabase.storage.from('merchant_images').upload(filePath, shopImage);
        if (uploadError) {
          throw uploadError;
        }

        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from('merchant_images').getPublicUrl(filePath);
        imageUrl = publicUrl;
        setIsUploading(false);
      }

      const {
        data: hoursResult,
        error: hoursError
      } = await supabase.rpc('update_merchant_hours', {
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

      const {
        error
      } = await supabase.from('merchants').update({
        shop_name: shopName,
        description: description,
        category: category,
        gender_focus: genderFocus,
        address: address,
        image_url: imageUrl
      }).eq('id', merchant.id);
      if (error) throw error;

      await generateSlotsForNext30Days(merchant.id);
      toast('Business information updated', {
        description: 'Your changes have been saved successfully and booking slots have been generated'
      });

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
        style: {
          backgroundColor: 'red',
          color: 'white'
        }
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
        style: {
          backgroundColor: 'red',
          color: 'white'
        }
      });
    }
  };

  const settingsItems = [
    {
      icon: User,
      title: 'Business Information',
      description: 'Manage your shop details and hours',
      href: '#business'
    },
    {
      icon: CreditCard,
      title: 'Banking Details',
      description: 'Manage payment and banking information',
      href: '#banking'
    },
    {
      icon: Mail,
      title: 'Contact Us',
      description: 'Get in touch with our support team',
      href: '/merchant/settings/contact'
    },
    {
      icon: Info,
      title: 'About BooqIt',
      description: 'App information and version details',
      href: '/merchant/settings/about'
    },
    {
      icon: Shield,
      title: 'Privacy Policy',
      description: 'Learn how we protect your data',
      href: '/merchant/settings/privacy-policy'
    },
    {
      icon: FileText,
      title: 'Terms & Conditions',
      description: 'Our terms of service',
      href: '/merchant/settings/terms-conditions'
    }
  ];

  const dangerItems = [
    {
      icon: Trash2,
      title: 'Delete Account',
      description: 'Permanently delete your account and data',
      href: '/merchant/settings/delete-account',
      isDestructive: true
    }
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-booqit-primary" />
            <div>
              <h1 className="text-xl font-semibold">Settings</h1>
              <p className="text-sm text-gray-600">Manage your account and preferences</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* User Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-booqit-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-booqit-primary" />
              </div>
              <div>
                <h3 className="font-medium">{merchant?.shop_name || 'Shop Name'}</h3>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <p className="text-xs text-gray-500">Merchant Account</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access - Business & Banking */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold px-1 mb-3">Business Management</h2>
          <Card className="hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Business Information</h3>
                    <p className="text-sm text-gray-600">Manage your shop details and hours</p>
                  </div>
                </div>
                <a href="#business-form" className="text-booqit-primary">
                  <ChevronRight className="h-5 w-5" />
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Banking Details</h3>
                    <p className="text-sm text-gray-600">Manage payment and banking information</p>
                  </div>
                </div>
                <a href="#banking-form" className="text-booqit-primary">
                  <ChevronRight className="h-5 w-5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* General Settings */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold px-1 mb-3">General Settings</h2>
          {settingsItems.slice(2).map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold px-1 mb-3 text-red-600">Danger Zone</h2>
          {dangerItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="hover:bg-red-50 transition-colors border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-red-700">{item.title}</h3>
                        <p className="text-sm text-red-600">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Business Information Form */}
        <div id="business-form">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <p className="text-sm text-gray-600">Update your shop details and operating hours</p>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        {/* Banking Details Form */}
        <div id="banking-form">
          <Card>
            <CardHeader>
              <CardTitle>Banking Details</CardTitle>
              <p className="text-sm text-gray-600">Manage your payment and banking information</p>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
