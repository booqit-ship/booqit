
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Store, User } from 'lucide-react';
import { UserRole } from '@/types';
import { useNavigate } from 'react-router-dom';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelect }) => {
  const navigate = useNavigate();

  // Handle customer selection with phone auth
  const handleCustomerClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    navigate('/phone-auth');
  };

  // Handle merchant selection with existing email auth
  const handleMerchantClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onRoleSelect('merchant');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ duration: 0.5 }} 
        className="w-full max-w-md space-y-6"
      >
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-5xl font-righteous mb-2 text-black font-medium">
            booqit
          </h1>
          <p className="text-gray-600 font-poppins">Choose how you want to continue</p>
        </div>

        {/* Static Image - No Loading Logic */}
        <div className="text-center">
          <div className="relative w-full h-64 mx-auto overflow-hidden rounded-lg">
            <img 
              src="/lovable-uploads/d7dc2456-35dc-4a91-bbac-3783a243d686.png"
              alt="BooqIt Service Illustration" 
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>

        {/* Role Selection Cards */}
        <div className="space-y-4">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-booqit-primary/50">
            <CardContent 
              className="p-6" 
              onClick={handleCustomerClick}
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-booqit-primary/10 rounded-full">
                  <User className="h-6 w-6 text-booqit-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-righteous font-light">I'm a Customer</h3>
                  <p className="text-gray-600 text-sm font-poppins">Book appointments at Salons & Beauty Salon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-booqit-secondary/50">
            <CardContent 
              className="p-6" 
              onClick={handleMerchantClick}
            >
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
    </div>
  );
};

export default RoleSelection;
