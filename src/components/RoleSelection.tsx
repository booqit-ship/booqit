
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
        
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-righteous mb-2 text-black font-medium">
            booqit
          </h1>
          <p className="text-gray-600 font-poppins text-lg">Choose how you want to continue</p>
        </div>

        {/* Illustration Image */}
        <div className="text-center mb-6">
          <motion.img 
            src="/lovable-uploads/9e4fc548-4f9a-44a5-a3da-32ba3a02eab8.png"
            alt="BooqIt Illustration"
            className="w-64 h-64 mx-auto mb-6 object-contain"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        </div>

        {/* Role Selection Cards */}
        <div className="space-y-4">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-booqit-primary/50 bg-white/80 backdrop-blur-sm rounded-2xl">
            <CardContent className="p-6" onClick={() => onRoleSelect('customer')}>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-righteous font-medium text-gray-900">I'm a Customer</h3>
                  <p className="text-gray-600 text-sm font-poppins">Book appointments at Salons & Beauty Salon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-booqit-primary/50 bg-white/80 backdrop-blur-sm rounded-2xl">
            <CardContent className="p-6" onClick={() => onRoleSelect('merchant')}>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-pink-100 rounded-full">
                  <Store className="h-6 w-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-righteous text-lg font-medium text-gray-900">I'm a Business Owner</h3>
                  <p className="text-gray-600 text-sm font-poppins">Manage my Salon or Beauty Salon business</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="text-center pt-4">
          <p className="text-xs text-gray-500 font-poppins">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
