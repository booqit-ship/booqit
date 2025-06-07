
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Merchant } from '@/types';

interface ProfileBusinessFormProps {
  merchant: Merchant | null | undefined;
  isFetching: boolean;
}

const ProfileBusinessForm: React.FC<ProfileBusinessFormProps> = ({ merchant, isFetching }) => {
  const [shopName, setShopName] = useState(merchant?.shop_name || '');
  const [description, setDescription] = useState(merchant?.description || '');
  const [category, setCategory] = useState(merchant?.category || '');
  const [openTime, setOpenTime] = useState(merchant?.open_time || '');
  const [closeTime, setCloseTime] = useState(merchant?.close_time || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (merchant) {
      setShopName(merchant.shop_name || '');
      setDescription(merchant.description || '');
      setCategory(merchant.category || '');
      setOpenTime(merchant.open_time || '');
      setCloseTime(merchant.close_time || '');
    }
  }, [merchant]);

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
    
    setIsSaving(true);
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
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['merchant-profile', userId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update business information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Business Information
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-booqit-primary" />}
        </CardTitle>
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
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileBusinessForm;
