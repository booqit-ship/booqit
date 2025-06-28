
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Shield, ArrowLeft } from 'lucide-react';

interface OTPVerificationProps {
  phoneNumber: string;
  onVerifyOTP: (code: string) => Promise<void>;
  onResendOTP: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error?: string;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  phoneNumber,
  onVerifyOTP,
  onResendOTP,
  onBack,
  loading,
  error
}) => {
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otp.length === 6) {
      await onVerifyOTP(otp);
    }
  };

  const handleResend = async () => {
    setResendCooldown(30);
    await onResendOTP();
  };

  const maskedPhone = phoneNumber.replace(/(\+\d{1,3})\d+(\d{4})/, '$1****$2');

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto bg-booqit-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-booqit-primary" />
        </div>
        <CardTitle className="text-xl font-righteous">Verify Phone Number</CardTitle>
        <p className="text-gray-500 text-sm">
          Enter the 6-digit code sent to<br />
          <span className="font-medium text-gray-700">{maskedPhone}</span>
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            disabled={loading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={handleVerify}
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
          disabled={loading || otp.length !== 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Code'
          )}
        </Button>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">Didn't receive the code?</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="text-booqit-primary hover:text-booqit-primary/80"
          >
            {resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              'Resend Code'
            )}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="w-full"
          disabled={loading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Change Phone Number
        </Button>
      </CardContent>
    </Card>
  );
};

export default OTPVerification;
