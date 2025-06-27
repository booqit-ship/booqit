
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Star, Crown, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Staff } from '@/types';
import { toast } from 'sonner';
import { PageHeader } from '@/components/booking/PageHeader';
import { AnimatedCard } from '@/components/booking/AnimatedCard';
import { AnimatedButton } from '@/components/booking/AnimatedButton';
import { FloatingBottomBar } from '@/components/booking/FloatingBottomBar';

const StaffSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { merchant, selectedServices, totalPrice, totalDuration } = location.state;

  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('any');
  const [selectedStaffDetails, setSelectedStaffDetails] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        if (!merchantId) return;

        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);

        if (error) {
          console.error('Error fetching staff:', error);
          throw error;
        }
        
        setStaff(data || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error('Could not load staff');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [merchantId]);

  const handleStaffChange = (value: string) => {
    setSelectedStaff(value);
    if (value === 'any') {
      setSelectedStaffDetails(null);
    } else {
      const staffMember = staff.find(s => s.id === value);
      setSelectedStaffDetails(staffMember || null);
    }
  };

  const handleContinue = () => {
    navigate(`/booking/${merchantId}/datetime`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration,
        selectedStaff: selectedStaff === 'any' ? null : selectedStaff,
        selectedStaffDetails
      }
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 pb-24">
      <PageHeader
        title="Choose Stylist"
        subtitle="Select your preferred stylist"
        onBack={() => navigate(-1)}
        progress={50}
      />

      <div className="p-4">
        {/* Selected Services Summary */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <AnimatedCard className="bg-gradient-to-r from-purple-100 to-purple-200 shadow-xl">
            <div className="p-4">
              <h3 className="font-righteous text-lg font-bold text-purple-800 mb-2">
                Your Services ({selectedServices?.length})
              </h3>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  {selectedServices?.slice(0, 2).map((service: any) => (
                    <p key={service.id} className="font-poppins text-sm text-purple-700">
                      {service.name}
                    </p>
                  ))}
                  {selectedServices?.length > 2 && (
                    <p className="font-poppins text-sm text-purple-600">
                      +{selectedServices.length - 2} more services
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-righteous text-xl font-bold text-purple-700">₹{totalPrice}</p>
                  <p className="font-poppins text-sm text-purple-600">{totalDuration} minutes</p>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Stylist Selection */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-righteous text-xl font-bold text-gray-800">Select Stylist</h3>
            <div className="bg-gradient-to-r from-blue-100 to-blue-200 px-3 py-1 rounded-full">
              <span className="text-blue-700 font-poppins text-sm font-medium">
                {staff.length + 1} options
              </span>
            </div>
          </div>

          {/* Any Stylist Option */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatedCard
              selected={selectedStaff === 'any'}
              onClick={() => handleStaffChange('any')}
              className="bg-white shadow-lg hover:shadow-xl"
            >
              <div className="p-4">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h4 className="font-righteous text-lg font-bold text-gray-800">
                        Any Available Stylist
                      </h4>
                      <Crown className="h-5 w-5 text-yellow-500 ml-2" />
                    </div>
                    <p className="text-gray-600 font-poppins text-sm">
                      We'll assign the best available stylist for you
                    </p>
                    <div className="flex items-center mt-2">
                      <div className="flex items-center bg-green-100 px-2 py-1 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                        <span className="text-green-700 font-poppins text-xs font-medium">
                          Fastest booking
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: selectedStaff === 'any' ? 1 : 0.8 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-6 h-6 rounded-full border-2 ${
                      selectedStaff === 'any' 
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 border-purple-500' 
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedStaff === 'any' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
                    )}
                  </motion.div>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>

          {/* Individual Staff Options */}
          {staff.map((stylist, index) => (
            <motion.div
              key={stylist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 1) * 0.1, duration: 0.5 }}
            >
              <AnimatedCard
                selected={selectedStaff === stylist.id}
                onClick={() => handleStaffChange(stylist.id)}
                className="bg-white shadow-lg hover:shadow-xl"
              >
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                        <span className="text-white font-righteous text-2xl">
                          {stylist.name.charAt(0)}
                        </span>
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-righteous text-lg font-bold text-gray-800 mb-1">
                        {stylist.name}
                      </h4>
                      <p className="text-gray-600 font-poppins text-sm mb-2">
                        Hair Specialist
                      </p>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className="h-4 w-4 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                        </div>
                        <span className="text-gray-500 font-poppins text-sm">5.0</span>
                      </div>
                    </div>
                    
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: selectedStaff === stylist.id ? 1 : 0.8 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={`w-6 h-6 rounded-full border-2 ${
                        selectedStaff === stylist.id 
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 border-purple-500' 
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedStaff === stylist.id && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1"></div>
                      )}
                    </motion.div>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          ))}

          {staff.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-gray-50 rounded-xl"
            >
              <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 font-poppins text-lg mb-2">No stylists available</p>
              <p className="text-gray-400 font-poppins text-sm">You can still proceed with your booking</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      <FloatingBottomBar>
        <AnimatedButton
          onClick={handleContinue}
          size="lg"
          gradient
          className="w-full"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Continue to Date & Time
        </AnimatedButton>
      </FloatingBottomBar>
    </div>
  );
};

export default StaffSelectionPage;
