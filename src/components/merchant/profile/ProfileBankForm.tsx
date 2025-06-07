
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Merchant, BankInfo } from '@/types';

interface ProfileBankFormProps {
  merchant: Merchant | null | undefined;
  bankInfo: BankInfo | null | undefined;
  isFetching: boolean;
}

const ProfileBankForm: React.FC<ProfileBankFormProps> = ({ merchant, bankInfo, isFetching }) => {
  const [accountName, setAccountName] = useState(bankInfo?.account_holder_name || '');
  const [accountNumber, setAccountNumber] = useState(bankInfo?.account_number || '');
  const [ifscCode, setIfscCode] = useState(bankInfo?.ifsc_code || '');
  const [bankName, setBankName] = useState(bankInfo?.bank_name || '');
  const [upiId, setUpiId] = useState(bankInfo?.upi_id || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (bankInfo) {
      setAccountName(bankInfo.account_holder_name || '');
      setAccountNumber(bankInfo.account_number || '');
      setIfscCode(bankInfo.ifsc_code || '');
      setBankName(bankInfo.bank_name || '');
      setUpiId(bankInfo.upi_id || '');
    }
  }, [bankInfo]);

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
    
    setIsSaving(true);
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
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['bank-info', merchant.id] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update bank information. Please try again.",
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
          Bank Details
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-booqit-primary" />}
        </CardTitle>
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

export default ProfileBankForm;
