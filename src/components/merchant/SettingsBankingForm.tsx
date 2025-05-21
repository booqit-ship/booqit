
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { BankInfo } from '@/types';

interface SettingsBankingFormProps {
  bankInfo: BankInfo | null;
  isSavingBank: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  accountHolderName: string;
  setAccountHolderName: React.Dispatch<React.SetStateAction<string>>;
  accountNumber: string;
  setAccountNumber: React.Dispatch<React.SetStateAction<string>>;
  bankName: string;
  setBankName: React.Dispatch<React.SetStateAction<string>>;
  ifscCode: string;
  setIfscCode: React.Dispatch<React.SetStateAction<string>>;
  upiId: string;
  setUpiId: React.Dispatch<React.SetStateAction<string>>;
}

const SettingsBankingForm: React.FC<SettingsBankingFormProps> = ({
  bankInfo,
  isSavingBank,
  onSave,
  accountHolderName,
  setAccountHolderName,
  accountNumber,
  setAccountNumber,
  bankName,
  setBankName,
  ifscCode,
  setIfscCode,
  upiId,
  setUpiId
}) => {
  return (
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
        
        <form onSubmit={onSave} className="space-y-4">
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
  );
};

export default SettingsBankingForm;
