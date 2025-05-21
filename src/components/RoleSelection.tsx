
import React from 'react';
import { motion } from 'framer-motion';
import { UserRole } from '../types';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelect }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-booqit-primary/10 to-white">
      <div className="flex-1 flex flex-col justify-center items-center p-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-4xl font-bold text-booqit-dark">Welcome to BooqIt</h1>
          <p className="text-lg text-booqit-dark/70 mt-2">Choose how you want to use the app</p>
        </motion.div>
        
        <motion.div 
          className="w-full max-w-md space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <button
            onClick={() => onRoleSelect('customer')}
            className="w-full relative overflow-hidden group bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-booqit-primary"
          >
            <div className="flex items-center">
              <div className="bg-booqit-primary/10 rounded-full p-4">
                <svg className="w-10 h-10 text-booqit-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div className="ml-4 text-left">
                <h3 className="text-xl font-semibold text-booqit-dark">I'm a Customer</h3>
                <p className="text-booqit-dark/70 mt-1">Book services from local businesses</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-booqit-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </button>
          
          <button
            onClick={() => onRoleSelect('merchant')}
            className="w-full relative overflow-hidden group bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-booqit-secondary"
          >
            <div className="flex items-center">
              <div className="bg-booqit-secondary/10 rounded-full p-4">
                <svg className="w-10 h-10 text-booqit-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
              <div className="ml-4 text-left">
                <h3 className="text-xl font-semibold text-booqit-dark">I'm a Merchant</h3>
                <p className="text-booqit-dark/70 mt-1">Manage your business and get bookings</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-booqit-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </button>
        </motion.div>
      </div>

      <motion.div 
        className="p-6 text-center text-booqit-dark/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <p>© 2025 BooqIt - India's Booking Platform</p>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
