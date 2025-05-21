
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BankDetailsState {
  account_holder_name: string;
  account_number: string;
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="account_holder_name">Account Holder Name</Label>
        <Input
          id="account_holder_name"
          name="account_holder_name"
          placeholder="Enter account holder name"
          value={bankDetails.account_holder_name}
          onChange={handleChange}
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
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ifsc_code">IFSC Code</Label>
        <Input
          id="ifsc_code"
          name="ifsc_code"
          placeholder="Enter IFSC code"
          value={bankDetails.ifsc_code}
          onChange={handleChange}
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
        />
      </div>
    </div>
  );
};

export default BankDetailsForm;
