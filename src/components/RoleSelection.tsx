import React from 'react';
import { motion } from 'framer-motion';
import { UserRole } from '../types';
interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}
const RoleSelection: React.FC<RoleSelectionProps> = ({
  onRoleSelect
}) => {
  return <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white px-6 py-8">
      {/* Header */}
      <motion.div initial={{
      y: -20,
      opacity: 0
    }} animate={{
      y: 0,
      opacity: 1
    }} transition={{
      duration: 0.6
    }} className="text-center mb-8">
        <div className="text-4xl md:text-5xl font-bold mb-4">
          <span className="text-black">booq</span>
          <span className="text-zinc-950">it</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2">
          Please select your role to continue
        </h1>
      </motion.div>

      {/* Illustration */}
      <motion.div initial={{
      scale: 0.8,
      opacity: 0
    }} animate={{
      scale: 1,
      opacity: 1
    }} transition={{
      duration: 0.8,
      delay: 0.2
    }} className="flex-1 flex items-center justify-center mb-8">
        <div className="relative w-80 h-80 md:w-96 md:h-96">
          {/* Background elements */}
          <motion.div animate={{
          rotate: 360
        }} transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }} className="absolute top-8 left-8 w-6 h-6">
            <div className="w-full h-full bg-green-400 rounded-full opacity-30"></div>
          </motion.div>
          
          <motion.div animate={{
          y: [-10, 10, -10]
        }} transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }} className="absolute top-12 right-12">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-500">
              <path d="M12 2L14 8L20 9L15 14L16 20L12 18L8 20L9 14L4 9L10 8L12 2Z" fill="currentColor" />
            </svg>
          </motion.div>

          {/* Customer Character */}
          <motion.div animate={{
          y: [0, -8, 0],
          rotate: [0, 1, -1, 0]
        }} transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }} className="absolute left-0 top-1/2 transform -translate-y-1/2">
            <div className="w-32 h-40 md:w-36 md:h-44 relative">
              {/* Customer body */}
              <div className="absolute bottom-0 w-full h-24 bg-teal-500 rounded-t-full"></div>
              {/* Customer head */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-orange-200 rounded-full"></div>
              {/* Hair */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-12 bg-amber-800 rounded-full"></div>
              {/* Eyes */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
              {/* Smile */}
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-4 h-2 border-b-2 border-black rounded-full"></div>
              {/* Earring */}
              <motion.div animate={{
              rotate: [0, 10, -10, 0]
            }} transition={{
              duration: 2,
              repeat: Infinity
            }} className="absolute top-8 left-2 w-2 h-2 bg-yellow-400 rounded-full" />
            </div>
          </motion.div>

          {/* Merchant Character */}
          <motion.div animate={{
          y: [0, -6, 0],
          rotate: [0, -1, 1, 0]
        }} transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }} className="absolute right-0 top-1/2 transform -translate-y-1/2">
            <div className="w-32 h-40 md:w-36 md:h-44 relative">
              {/* Merchant body */}
              <div className="absolute bottom-0 w-full h-24 bg-blue-500 rounded-t-full"></div>
              {/* Merchant head */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-orange-200 rounded-full"></div>
              {/* Hair */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-12 bg-orange-600 rounded-full"></div>
              {/* Eyes */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
              {/* Smile */}
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-4 h-2 border-b-2 border-black rounded-full"></div>
              {/* Apron */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-20 bg-blue-600 rounded-t-3xl"></div>
              {/* Scissors */}
              <motion.div animate={{
              rotate: [0, 15, -15, 0]
            }} transition={{
              duration: 2.5,
              repeat: Infinity
            }} className="absolute top-4 right-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                  <path d="M9 12L11 14L20 4" stroke="currentColor" strokeWidth="2" />
                  <path d="M9 12L7 14L2 9" stroke="currentColor" strokeWidth="2" />
                </svg>
              </motion.div>
            </div>
          </motion.div>

          {/* Floating elements */}
          <motion.div animate={{
          x: [0, 10, 0],
          y: [0, -5, 0]
        }} transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }} className="absolute bottom-8 left-1/3 w-4 h-4 bg-green-400 rounded-full opacity-60" />
        </div>
      </motion.div>

      {/* Role Selection Buttons */}
      <motion.div className="space-y-4 max-w-md mx-auto w-full" initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.5,
      duration: 0.6
    }}>
        <motion.button whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }} onClick={() => onRoleSelect('customer')} className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-red-300">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-full p-4 mr-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-blue-900">Customer Login</h3>
              <p className="text-gray-600 mt-1">Book services and manage your appointments</p>
            </div>
          </div>
        </motion.button>
        
        <motion.button whileHover={{
        scale: 1.02
      }} whileTap={{
        scale: 0.98
      }} onClick={() => onRoleSelect('merchant')} className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-orange-300">
          <div className="flex items-center">
            <div className="bg-orange-100 rounded-full p-4 mr-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-blue-900">Merchant Login</h3>
              <p className="text-gray-600 mt-1">Manage your services and bookings</p>
            </div>
          </div>
        </motion.button>
      </motion.div>
    </div>;
};
export default RoleSelection;