
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Store } from 'lucide-react';
import { UserRole } from '@/types';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({
  onRoleSelect
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-lavender-50 to-purple-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Hero Illustration */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative mx-auto mb-6"
          >
            <img 
              src="/lovable-uploads/bf410ca7-237a-4900-a629-385626a378d6.png"
              alt="BooqIt Illustration"
              className="w-64 h-64 mx-auto object-contain"
            />
          </motion.div>
        </div>

        {/* App Title */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-righteous font-bold text-gray-900 mb-2">
            booqit
          </h1>
          <p className="text-gray-600 font-poppins text-base">
            Choose how you want to continue
          </p>
        </motion.div>

        {/* Role Selection Cards */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="space-y-4"
        >
          {/* Customer Card */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:scale-[1.02] bg-white"
            onClick={() => onRoleSelect('customer')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-righteous font-semibold text-gray-900 mb-1">
                    I'm a Customer
                  </h3>
                  <p className="text-gray-600 text-sm font-poppins leading-relaxed">
                    Book appointments at Salons & Beauty Salon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Owner Card */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:scale-[1.02] bg-white"
            onClick={() => onRoleSelect('merchant')}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Store className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-righteous text-lg font-semibold text-gray-900 mb-1">
                    I'm a Business Owner
                  </h3>
                  <p className="text-gray-600 text-sm font-poppins leading-relaxed">
                    Manage my Salon or Beauty Salon business
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Terms and Privacy */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center mt-8"
        >
          <p className="text-xs text-gray-500 font-poppins leading-relaxed px-4">
            By continuing, you agree to our{' '}
            <span className="text-purple-600 underline cursor-pointer">Terms of Service</span>
            {' '}and{' '}
            <span className="text-purple-600 underline cursor-pointer">Privacy Policy</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
