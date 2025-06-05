
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, User } from 'lucide-react';
import { UserRole } from '@/types';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({
  onRoleSelect
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-white flex flex-col justify-center items-center p-4 py-8">
      <motion.div
        initial={{
          scale: 0.9,
          opacity: 0
        }}
        animate={{
          scale: 1,
          opacity: 1
        }}
        transition={{
          duration: 0.5
        }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        {/* App Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 text-black">
            booqit
          </h1>
          <p className="text-gray-600 text-sm font-medium">Choose how you want to continue</p>
        </div>

        {/* Girl Illustration */}
        <div className="mb-4">
          <img 
            src="/lovable-uploads/6057967e-be37-4ef4-9cdc-05c999880b63.png"
            alt="Girl using phone"
            className="w-48 h-auto object-contain"
          />
        </div>

        {/* Role Selection Cards */}
        <div className="w-full space-y-3">
          {/* Customer Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white"
            onClick={() => onRoleSelect('customer')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-full flex-shrink-0">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-black mb-1">I'm a Customer</h3>
                  <p className="text-gray-600 text-xs">
                    Book appointments at Salons & Beauty Salon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Owner Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white"
            onClick={() => onRoleSelect('merchant')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                  <Store className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-black mb-1">I'm a Business Owner</h3>
                  <p className="text-gray-600 text-xs">
                    Manage my Salon or Beauty Salon business
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
