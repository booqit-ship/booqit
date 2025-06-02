import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Lock, Info } from 'lucide-react';
import { BankInfo } from '@/types';
import { Separator } from '@/components/ui/separator';
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
  return <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Lock className="h-5 w-5 text-booqit-primary" />
          Banking Details
        </CardTitle>
        <CardDescription>
          Your account payment information is protected and secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6 border-booqit-primary/20 bg-booqit-primary/5">
          <Shield className="h-5 w-5 text-booqit-primary" />
          <AlertTitle>Secure Banking Information</AlertTitle>
          <AlertDescription className="mt-2">
            For security reasons, banking details cannot be modified through the dashboard. 
            If you need to update your banking information, please contact our support team.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="accountHolderName" className="text-sm text-muted-foreground">Account Holder Name</Label>
              <Input id="accountHolderName" value={accountHolderName} className="bg-muted cursor-not-allowed" disabled readOnly />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountNumber" className="text-sm text-muted-foreground">Account Number</Label>
              <Input id="accountNumber" value={accountNumber ? accountNumber.replace(/\d(?=\d{4})/g, '*') : ''} className="bg-muted cursor-not-allowed" disabled readOnly />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bankName" className="text-sm text-muted-foreground">Bank Name</Label>
              <Input id="bankName" value={bankName} className="bg-muted cursor-not-allowed" disabled readOnly />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ifscCode" className="text-sm text-muted-foreground">IFSC Code</Label>
              <Input id="ifscCode" value={ifscCode} className="bg-muted cursor-not-allowed" disabled readOnly />
            </div>
            
            {upiId && <div className="space-y-2 md:col-span-2">
                <Label htmlFor="upiId" className="text-sm text-muted-foreground">UPI ID</Label>
                <Input id="upiId" value={upiId} className="bg-muted cursor-not-allowed" disabled readOnly />
              </div>}
          </div>
          
          <Separator />
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-700">Need to update your banking details?</h4>
                <p className="text-blue-600 text-sm mt-1">For security reasons, please contact our support team at support@booqit.in  to update your banking information.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
};
export default SettingsBankingForm;