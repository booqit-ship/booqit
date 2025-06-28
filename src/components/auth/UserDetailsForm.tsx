
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, User } from 'lucide-react';
import { UserRole } from '@/types';

interface UserDetailsFormProps {
  phoneNumber: string;
  onComplete: (name: string, role: UserRole) => Promise<void>;
  loading: boolean;
  error?: string;
}

const UserDetailsForm: React.FC<UserDetailsFormProps> = ({
  phoneNumber,
  onComplete,
  loading,
  error
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    await onComplete(name.trim(), role);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto bg-booqit-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
          <User className="w-6 h-6 text-booqit-primary" />
        </div>
        <CardTitle className="text-xl font-righteous">Complete Your Profile</CardTitle>
        <p className="text-gray-500 text-sm">Tell us a bit about yourself</p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>I am a *</Label>
            <RadioGroup value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="customer" id="customer" />
                <Label htmlFor="customer" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">Customer</div>
                    <div className="text-sm text-gray-500">I want to book appointments</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="merchant" id="merchant" />
                <Label htmlFor="merchant" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">Business Owner</div>
                    <div className="text-sm text-gray-500">I want to manage my salon/shop</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            type="submit"
            className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
            disabled={loading || !name.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Complete Registration'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserDetailsForm;
