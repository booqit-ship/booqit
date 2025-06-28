
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Phone } from 'lucide-react';

interface PhoneInputProps {
  onSendOTP: (phoneNumber: string) => Promise<void>;
  loading: boolean;
  error?: string;
}

const countryCodes = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
];

const PhoneInput: React.FC<PhoneInputProps> = ({ onSendOTP, loading, error }) => {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      return;
    }

    const fullPhoneNumber = countryCode + phoneNumber.trim();
    await onSendOTP(fullPhoneNumber);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format based on country code
    if (countryCode === '+91') {
      // Indian format: 12345 67890
      return digits.replace(/(\d{5})(\d{0,5})/, '$1 $2').trim();
    }
    
    return digits;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto bg-booqit-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
          <Phone className="w-6 h-6 text-booqit-primary" />
        </div>
        <CardTitle className="text-xl font-righteous">Enter Phone Number</CardTitle>
        <p className="text-gray-500 text-sm">We'll send you a verification code</p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countryCodes.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <div className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.country}</span>
                      <span className="text-gray-500">{country.code}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="flex">
              <div className="bg-gray-50 px-3 py-2 border border-r-0 rounded-l-md text-sm font-medium">
                {countryCode}
              </div>
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                className="rounded-l-none"
                maxLength={countryCode === '+91' ? 11 : 15}
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
            disabled={loading || !phoneNumber.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Code...
              </>
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </form>

        {/* Hidden reCAPTCHA container */}
        <div id="recaptcha-container"></div>
      </CardContent>
    </Card>
  );
};

export default PhoneInput;
