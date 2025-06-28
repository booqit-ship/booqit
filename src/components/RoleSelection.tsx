
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Store, ArrowRight } from 'lucide-react';
import { UserRole } from '@/types';
import { useNavigate } from 'react-router-dom';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelect }) => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: UserRole) => {
    // Navigate directly to phone auth instead of email auth
    navigate('/phone-auth', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-booqit-primary/20 to-white p-6">
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-righteous text-booqit-dark mb-4">
          Welcome to BooqIt
        </h1>
        <p className="text-booqit-dark/70 font-poppins text-lg">
          Choose how you'd like to use our platform
        </p>
      </motion.div>

      <div className="w-full max-w-2xl grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-booqit-primary/30 cursor-pointer group">
            <CardContent className="p-8 text-center h-full flex flex-col justify-between">
              <div>
                <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-booqit-primary/10 transition-colors">
                  <Users className="w-8 h-8 text-blue-600 group-hover:text-booqit-primary transition-colors" />
                </div>
                <h3 className="text-xl font-righteous text-gray-800 mb-3">I'm a Customer</h3>
                <p className="text-gray-600 font-poppins mb-6">
                  Book appointments at salons, spas, and beauty services near you
                </p>
              </div>
              <Button 
                onClick={() => handleRoleSelect('customer')}
                className="w-full bg-blue-600 hover:bg-blue-700 font-poppins group-hover:bg-booqit-primary group-hover:hover:bg-booqit-primary/90 transition-colors"
              >
                Continue as Customer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-booqit-primary/30 cursor-pointer group">
            <CardContent className="p-8 text-center h-full flex flex-col justify-between">
              <div>
                <div className="mx-auto bg-booqit-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-6 group-hover:bg-booqit-primary/20 transition-colors">
                  <Store className="w-8 h-8 text-booqit-primary transition-colors" />
                </div>
                <h3 className="text-xl font-righteous text-gray-800 mb-3">I'm a Business Owner</h3>
                <p className="text-gray-600 font-poppins mb-6">
                  Manage your salon, accept bookings, and grow your business
                </p>
              </div>
              <Button 
                onClick={() => handleRoleSelect('merchant')}
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90 font-poppins"
              >
                Continue as Business
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div 
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <p className="text-gray-500 font-poppins text-sm">
          Already have an account? 
          <Button 
            variant="link" 
            className="font-poppins text-booqit-primary hover:text-booqit-primary/80 p-1"
            onClick={() => navigate('/auth')}
          >
            Sign in with email
          </Button>
        </p>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
