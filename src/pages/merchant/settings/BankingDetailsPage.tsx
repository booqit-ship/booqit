
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Merchant, BankInfo } from '@/types';
import SettingsBankingForm from '@/components/merchant/SettingsBankingForm';
import { toast } from 'sonner';

const BankingDetailsPage: React.FC = () => {
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  // Form states
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      try {
        setIsLoading(true);
        
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
            setCanEdit(false); // Bank details exist, so they can't edit (contact support)
          } else {
            // No bank info exists, allow them to add it
            setCanEdit(true);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        toast('Failed to load banking data', {
          description: 'Please try again later',
          style: { backgroundColor: 'red', color: 'white' }
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleUpdateBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEdit) {
      toast('Banking details cannot be modified', {
        description: 'Please contact support for assistance',
        style: { backgroundColor: 'red', color: 'white' }
      });
      return;
    }

    if (!accountHolderName || !accountNumber || !confirmAccountNumber || !ifscCode || !bankName) {
      toast('Please fill in all required fields', {
        style: { backgroundColor: 'red', color: 'white' }
      });
      return;
    }

    if (accountNumber !== confirmAccountNumber) {
      toast('Account numbers do not match', {
        style: { backgroundColor: 'red', color: 'white' }
      });
      return;
    }

    if (!merchant) return;

    setIsSavingBank(true);
    
    try {
      const { error } = await supabase
        .from('bank_info')
        .insert({
          merchant_id: merchant.id,
          account_holder_name: accountHolderName,
          account_number: accountNumber,
          ifsc_code: ifscCode,
          bank_name: bankName,
          upi_id: upiId || null,
        });

      if (error) throw error;

      toast('Bank details saved successfully!', {
        style: { backgroundColor: 'green', color: 'white' }
      });
      
      // Refresh the page to show updated state
      window.location.reload();
    } catch (error: any) {
      console.error('Error saving bank info:', error);
      toast('Failed to save bank details', {
        description: error.message,
        style: { backgroundColor: 'red', color: 'white' }
      });
    } finally {
      setIsSavingBank(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link to="/merchant/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Banking Details</h1>
            <p className="text-sm text-gray-600">Manage your payment and banking information</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        <SettingsBankingForm 
          bankInfo={bankInfo} 
          canEdit={canEdit}
          isSavingBank={isSavingBank} 
          onSave={handleUpdateBankInfo} 
          accountHolderName={accountHolderName} 
          setAccountHolderName={setAccountHolderName} 
          accountNumber={accountNumber} 
          setAccountNumber={setAccountNumber}
          confirmAccountNumber={confirmAccountNumber}
          setConfirmAccountNumber={setConfirmAccountNumber}
          bankName={bankName} 
          setBankName={setBankName} 
          ifscCode={ifscCode} 
          setIfscCode={setIfscCode} 
          upiId={upiId} 
          setUpiId={setUpiId} 
        />
      </div>
    </div>
  );
};

export default BankingDetailsPage;
