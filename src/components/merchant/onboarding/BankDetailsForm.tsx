
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

interface BankDetailsState {
  account_holder_name: string;
  account_number: string;
  confirm_account_number: string;
  ifsc_code: string;
  bank_name: string;
  upi_id: string;
}

interface BankDetailsFormProps {
  bankDetails: BankDetailsState;
  setBankDetails: React.Dispatch<React.SetStateAction<BankDetailsState>>;
}

const BankDetailsForm: React.FC<BankDetailsFormProps> = ({ 
  bankDetails,
  setBankDetails 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({ ...prev, [name]: value }));
  };

  const accountNumbersMatch = bankDetails.account_number === bankDetails.confirm_account_number;
  const showMismatchError = bankDetails.account_number && bankDetails.confirm_account_number && !accountNumbersMatch;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Bank Details (Optional)</h4>
            <p className="text-sm text-blue-700 mt-1">
              We're currently working on enabling online payments. You can add your bank details now or skip this step and add them later from settings when online payments are available.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account_holder_name">Account Holder Name</Label>
        <Input
          id="account_holder_name"
          name="account_holder_name"
          placeholder="Enter account holder name"
          value={bankDetails.account_holder_name}
          onChange={handleChange}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account_number">Account Number</Label>
        <Input
          id="account_number"
          name="account_number"
          placeholder="Enter account number"
          value={bankDetails.account_number}
          onChange={handleChange}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_account_number">Confirm Account Number</Label>
        <Input
          id="confirm_account_number"
          name="confirm_account_number"
          placeholder="Re-enter account number"
          value={bankDetails.confirm_account_number}
          onChange={handleChange}
          className={`h-12 ${showMismatchError ? 'border-red-500 focus:border-red-500' : ''}`}
        />
        {showMismatchError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              Account numbers do not match. Please check and try again.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ifsc_code">IFSC Code</Label>
        <Input
          id="ifsc_code"
          name="ifsc_code"
          placeholder="Enter IFSC code"
          value={bankDetails.ifsc_code}
          onChange={handleChange}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_name">Bank Name</Label>
        <Input
          id="bank_name"
          name="bank_name"
          placeholder="Enter bank name"
          value={bankDetails.bank_name}
          onChange={handleChange}
          className="h-12"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="upi_id">UPI ID (Optional)</Label>
        <Input
          id="upi_id"
          name="upi_id"
          placeholder="Enter UPI ID (e.g. name@upi)"
          value={bankDetails.upi_id || ''}
          onChange={handleChange}
          className="h-12"
        />
      </div>
    </div>
  );
};

export default BankDetailsForm;
