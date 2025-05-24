
import React from 'react';
import { motion } from 'framer-motion';
import { UserRole } from '../types';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({
  onRoleSelect
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white px-6 py-8">
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 0.6 }} 
        className="text-center mb-8"
      >
        <div className="text-4xl md:text-5xl font-bold mb-4">
          <span className="text-black">booq</span>
          <span className="text-zinc-950">it</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2">
          Please select your role to continue
        </h1>
      </motion.div>

      {/* Main Illustration */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ duration: 0.8, delay: 0.2 }} 
        className="flex-1 flex items-center justify-center mb-8"
      >
        <div className="relative w-full max-w-lg mx-auto">
          {/* Background decorative elements */}
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }} 
            className="absolute top-4 left-4 w-4 h-4 md:w-6 md:h-6"
          >
            <div className="w-full h-full bg-green-400 rounded-full opacity-30"></div>
          </motion.div>
          
          <motion.div 
            animate={{ y: [-8, 8, -8] }} 
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute top-8 right-8"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500">
              <path d="M12 2L14 8L20 9L15 14L16 20L12 18L8 20L9 14L4 9L10 8L12 2Z" fill="currentColor" />
            </svg>
          </motion.div>

          {/* Main Role Selection Image */}
          <motion.div 
            animate={{ y: [0, -10, 0] }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
            className="flex justify-center items-center"
          >
            <img 
              src="/lovable-uploads/7797710d-bf5e-4099-85cd-be24703dc958.png" 
              alt="Customer and Merchant Selection" 
              className="w-full h-auto max-w-md md:max-w-lg object-contain"
            />
          </motion.div>

          {/* Floating decorative elements */}
          <motion.div 
            animate={{ x: [0, 8, 0], y: [0, -4, 0] }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute bottom-8 left-1/4 w-3 h-3 md:w-4 md:h-4 bg-green-400 rounded-full opacity-60" 
          />
          
          <motion.div 
            animate={{ x: [0, -6, 0], y: [0, 6, 0] }} 
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
            className="absolute bottom-12 right-1/4 w-2 h-2 md:w-3 md:h-3 bg-blue-400 rounded-full opacity-50" 
          />
        </div>
      </motion.div>

      {/* Role Selection Buttons */}
      <motion.div 
        className="space-y-4 max-w-md mx-auto w-full" 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }} 
          whileTap={{ scale: 0.98 }} 
          onClick={() => onRoleSelect('customer')} 
          className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-teal-300 group"
        >
          <div className="flex items-center">
            <motion.div 
              className="bg-teal-100 rounded-full p-4 mr-4 group-hover:bg-teal-200 transition-colors"
              whileHover={{ rotate: 5 }}
            >
              <img 
                src="/lovable-uploads/5976664f-883b-4bd0-b975-3bc90e236db2.png" 
                alt="Customer" 
                className="w-12 h-12 object-cover rounded-full"
              />
            </motion.div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-blue-900">Customer Login</h3>
              <p className="text-gray-600 mt-1">Book services and manage your appointments</p>
            </div>
          </div>
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }} 
          whileTap={{ scale: 0.98 }} 
          onClick={() => onRoleSelect('merchant')} 
          className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-300 group"
        >
          <div className="flex items-center">
            <motion.div 
              className="bg-blue-100 rounded-full p-4 mr-4 group-hover:bg-blue-200 transition-colors"
              whileHover={{ rotate: -5 }}
            >
              <img 
                src="/lovable-uploads/2487b385-ae31-49cd-87b5-97f3cffe0111.png" 
                alt="Merchant" 
                className="w-12 h-12 object-cover rounded-full"
              />
            </motion.div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-blue-900">Merchant Login</h3>
              <p className="text-gray-600 mt-1">Manage your services and bookings</p>
            </div>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
