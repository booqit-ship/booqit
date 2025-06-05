
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
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-white flex flex-col items-center justify-center p-4">
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
        className="w-full max-w-md space-y-6"
      >
        {/* App Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2 text-black">
            booqit
          </h1>
          <p className="text-gray-600 font-medium">Choose how you want to continue</p>
        </div>

        {/* Hero Illustration */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <img 
              src="/lovable-uploads/aa16b2b4-d26b-471d-9644-fb132cd3afc7.png"
              alt="Girl using phone"
              className="w-64 h-auto object-contain drop-shadow-lg"
            />
          </div>
        </div>

        {/* Role Selection Cards */}
        <div className="space-y-4">
          <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.02]">
            <CardContent className="p-6" onClick={() => onRoleSelect('customer')}>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-black mb-1">I'm a Customer</h3>
                  <p className="text-gray-600 text-sm font-medium">
                    Book appointments at Salons & Beauty Salon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.02]">
            <CardContent className="p-6" onClick={() => onRoleSelect('merchant')}>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Store className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-black mb-1">I'm a Business Owner</h3>
                  <p className="text-gray-600 text-sm font-medium">
                    Manage my Salon or Beauty Salon business
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500 font-medium">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
