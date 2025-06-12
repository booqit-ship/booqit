
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Merchant, BankInfo } from '@/types';
import SettingsBusinessForm from '@/components/merchant/SettingsBusinessForm';
import { toast } from 'sonner';

interface SqlResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const BusinessInformationPage: React.FC = () => {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMerchantData = async () => {
      if (!userId) return;
      try {
        setIsLoading(true);
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

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link to="/merchant/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Business Information</h1>
            <p className="text-sm text-gray-600">Update your shop details and operating hours</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
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
      </div>
    </div>
  );
};

export default BusinessInformationPage;
