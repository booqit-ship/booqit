
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { PersonStanding, Store } from 'lucide-react';
import { UserRole } from '@/types';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-lavender-50 to-purple-50 flex flex-col">
      {/* Hero Section with Image */}
      <div className="relative w-full bg-gradient-to-b from-purple-200/30 to-transparent">
        <div className="flex justify-center pt-12 pb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-[60%] max-w-[280px] relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-200/40 to-pink-200/40 rounded-full blur-3xl transform scale-110"></div>
            <img
              src="/lovable-uploads/29240cb3-3705-4db2-91f7-bde426ad2aba.png"
              alt="Girl using phone"
              className="w-full h-auto relative z-10 drop-shadow-lg"
            />
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-8">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-md mx-auto space-y-8"
        >
          {/* App Title and Subtitle */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-righteous font-bold text-gray-800 tracking-wide">
              booqit
            </h1>
            <p className="text-gray-600 font-poppins text-lg font-medium">
              Choose how you want to continue
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="space-y-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card 
                className="cursor-pointer bg-white hover:bg-gray-50 transition-all duration-300 border-0 shadow-lg hover:shadow-xl rounded-2xl overflow-hidden"
                onClick={() => onRoleSelect('customer')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl">
                      <PersonStanding className="h-7 w-7 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-righteous font-semibold text-gray-800 mb-1">
                        I'm a Customer
                      </h3>
                      <p className="text-gray-600 text-sm font-poppins leading-relaxed">
                        Book appointments at Salons & Beauty Salon
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card 
                className="cursor-pointer bg-white hover:bg-gray-50 transition-all duration-300 border-0 shadow-lg hover:shadow-xl rounded-2xl overflow-hidden"
                onClick={() => onRoleSelect('merchant')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl">
                      <Store className="h-7 w-7 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-righteous font-semibold text-gray-800 mb-1">
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
          </div>

          {/* Terms and Privacy */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center pt-4"
          >
            <p className="text-xs text-gray-500 font-poppins leading-relaxed">
              By continuing, you agree to our{' '}
              <span className="text-purple-600 hover:text-purple-700 cursor-pointer hover:underline transition-colors duration-200">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-purple-600 hover:text-purple-700 cursor-pointer hover:underline transition-colors duration-200">
                Privacy Policy
              </span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default RoleSelection;
