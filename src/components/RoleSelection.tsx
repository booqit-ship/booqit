
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
  return <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white flex flex-col items-center justify-center p-4">
      <motion.div initial={{
      scale: 0.9,
      opacity: 0
    }} animate={{
      scale: 1,
      opacity: 1
    }} transition={{
      duration: 0.5
    }} className="w-full max-w-md space-y-8">
        
        {/* Logo - moved higher up */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-righteous mb-2 text-black font-medium">
            booqit
          </h1>
          <p className="text-gray-600 font-poppins">Choose how you want to continue</p>
        </div>

        {/* New uploaded image - positioned right above role selection with no gap */}
        <div className="flex justify-center">
          <motion.img src="/lovable-uploads/10f1f54c-92d8-4cd0-ad62-b2d8651efd82.png" alt="BooqIt Service Illustration" initial={{
          scale: 0.8,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} transition={{
          duration: 0.6,
          delay: 0.2
        }} className="w-auto h-auto object-cover" />
        </div>

        {/* Role Selection Cards - directly connected to image above with no gap */}
        <div className="space-y-4 -mt-8">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-booqit-primary/50">
            <CardContent className="p-6" onClick={() => onRoleSelect('customer')}>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-booqit-primary/10 rounded-full">
                  <User className="h-6 w-6 text-booqit-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-righteous font-light">I'm a Customer</h3>
                  <p className="text-gray-600 text-sm font-poppins">Book appointments at Salons & Beauty Salon </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-booqit-primary/50">
            <CardContent className="p-6" onClick={() => onRoleSelect('merchant')}>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-booqit-secondary/10 rounded-full">
                  <Store className="h-6 w-6 text-booqit-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-righteous text-lg font-light">I'm a Business Owner</h3>
                  <p className="text-gray-600 text-sm font-poppins">Manage my Salon or Beauty Salon business</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-xs text-gray-500 font-poppins">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>;
};
export default RoleSelection;
