
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import BankDetailsForm from '@/components/merchant/onboarding/BankDetailsForm';
import LocationForm from '@/components/merchant/onboarding/LocationForm';
import ShopInfoForm from '@/components/merchant/onboarding/ShopInfoForm';

// Define steps for onboarding - changed order
const steps = [
  { id: 'info', title: 'Shop Information' },
  { id: 'location', title: 'Shop Location' },
  { id: 'bank', title: 'Bank Details' }
];

interface BankDetailsState {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  upi_id: string;
}

const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bankDetails, setBankDetails] = useState<BankDetailsState>({
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    bank_name: '',
    upi_id: '',
  });
  const [locationDetails, setLocationDetails] = useState({
    lat: 0,
    lng: 0,
    address: '',
  });
  const [shopInfo, setShopInfo] = useState({
    name: '',
    category: '',
    gender_focus: 'unisex', // New field for gender focus
    description: '',
    open_time: '',
    close_time: '',
    image: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId } = useAuth();

  // Check if merchant has already completed onboarding properly
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!userId) return;
      
      try {
        // Check if merchant record exists and if it's properly onboarded
        const { data: merchantData, error } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (merchantData) {
          // Check if merchant has completed onboarding (has proper address and location)
          const hasCompletedOnboarding = merchantData.address && 
                                       merchantData.address.trim() !== '' &&
                                       (merchantData.lat !== 0 || merchantData.lng !== 0);
          
          if (hasCompletedOnboarding) {
            console.log("Merchant has completed onboarding, redirecting to dashboard");
            toast({
              title: "Already onboarded",
              description: "Your merchant account is already set up.",
            });
            navigate('/merchant');
          } else {
            console.log("Merchant record exists but onboarding incomplete, continuing with onboarding");
            // Pre-fill form with existing data
            setShopInfo(prev => ({
              ...prev,
              name: merchantData.shop_name || '',
              category: merchantData.category || '',
              gender_focus: merchantData.gender_focus || 'unisex',
              description: merchantData.description || '',
              open_time: merchantData.open_time?.slice(0, 5) || '', // Convert HH:MM:SS to HH:MM
              close_time: merchantData.close_time?.slice(0, 5) || '', // Convert HH:MM:SS to HH:MM
            }));
            
            if (merchantData.lat && merchantData.lng) {
              setLocationDetails({
                lat: merchantData.lat,
                lng: merchantData.lng,
                address: merchantData.address || '',
              });
            }
          }
        } else {
          console.log("No merchant record found, continuing with onboarding");
        }
      } catch (error) {
        console.log("Error checking onboarding status:", error);
        // Continue with onboarding if there's an error
      } finally {
        setIsLoading(false);
      }
    };
    
    checkOnboardingStatus();
  }, [userId, navigate, toast]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to complete onboarding.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!shopInfo.name || !shopInfo.category || !shopInfo.open_time || !shopInfo.close_time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required shop information.",
        variant: "destructive",
      });
      return;
    }

    if (!locationDetails.address || (locationDetails.lat === 0 && locationDetails.lng === 0)) {
      toast({
        title: "Missing Location",
        description: "Please set your shop location.",
        variant: "destructive",
      });
      return;
    }

    if (!bankDetails.account_holder_name || !bankDetails.account_number || !bankDetails.ifsc_code || !bankDetails.bank_name) {
      toast({
        title: "Missing Bank Details",
        description: "Please fill in all required bank information.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Check if merchant record already exists
      const { data: existingMerchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', userId)
        .single();

      let merchantData;

      if (existingMerchant) {
        // Update existing merchant record
        const { data: updatedMerchant, error: merchantError } = await supabase
          .from('merchants')
          .update({
            shop_name: shopInfo.name,
            category: shopInfo.category,
            gender_focus: shopInfo.gender_focus,
            description: shopInfo.description,
            open_time: shopInfo.open_time,
            close_time: shopInfo.close_time,
            lat: locationDetails.lat,
            lng: locationDetails.lng,
            address: locationDetails.address,
          })
          .eq('user_id', userId)
          .select()
          .single();
        
        if (merchantError) throw merchantError;
        merchantData = updatedMerchant;
      } else {
        // Insert new merchant record
        const { data: newMerchant, error: merchantError } = await supabase
          .from('merchants')
          .insert({
            user_id: userId,
            shop_name: shopInfo.name,
            category: shopInfo.category,
            gender_focus: shopInfo.gender_focus,
            description: shopInfo.description,
            open_time: shopInfo.open_time,
            close_time: shopInfo.close_time,
            lat: locationDetails.lat,
            lng: locationDetails.lng,
            address: locationDetails.address,
          })
          .select()
          .single();
        
        if (merchantError) throw merchantError;
        merchantData = newMerchant;
      }
      
      // Handle bank details
      if (merchantData) {
        // Check if bank info already exists
        const { data: existingBankInfo } = await supabase
          .from('bank_info')
          .select('id')
          .eq('merchant_id', merchantData.id)
          .single();

        if (existingBankInfo) {
          // Update existing bank info
          const { error: bankError } = await supabase
            .from('bank_info')
            .update({
              account_holder_name: bankDetails.account_holder_name,
              account_number: bankDetails.account_number,
              ifsc_code: bankDetails.ifsc_code,
              bank_name: bankDetails.bank_name,
              upi_id: bankDetails.upi_id || null,
            })
            .eq('merchant_id', merchantData.id);
          
          if (bankError) throw bankError;
        } else {
          // Insert new bank info
          const { error: bankError } = await supabase
            .from('bank_info')
            .insert({
              merchant_id: merchantData.id,
              account_holder_name: bankDetails.account_holder_name,
              account_number: bankDetails.account_number,
              ifsc_code: bankDetails.ifsc_code,
              bank_name: bankDetails.bank_name,
              upi_id: bankDetails.upi_id || null,
            });
          
          if (bankError) throw bankError;
        }
      }
      
      // Upload shop image if provided
      if (shopInfo.image && merchantData) {
        const fileExt = shopInfo.image.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `merchants/${fileName}`;
        
        const { error: uploadError } = await supabase
          .storage
          .from('merchant_images')
          .upload(filePath, shopInfo.image);
          
        if (!uploadError) {
          // Update merchant record with image URL
          const { error: updateError } = await supabase
            .from('merchants')
            .update({ 
              image_url: `${filePath}` 
            })
            .eq('id', merchantData.id);
            
          if (updateError) console.error('Error updating merchant image URL:', updateError);
        } else {
          console.error('Error uploading image:', uploadError);
        }
      }
      
      // Show success message
      toast({
        title: "Onboarding Complete!",
        description: "Your merchant account is now set up.",
      });
      
      // Navigate to merchant dashboard
      navigate('/merchant');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step form based on new order
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ShopInfoForm 
            shopInfo={shopInfo} 
            setShopInfo={setShopInfo} 
          />
        );
      case 1:
        return (
          <LocationForm 
            locationDetails={locationDetails} 
            setLocationDetails={setLocationDetails} 
          />
        );
      case 2:
        return (
          <BankDetailsForm 
            bankDetails={bankDetails} 
            setBankDetails={setBankDetails} 
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-booqit-primary/10 to-white p-6">
      <motion.div 
        className="max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-booqit-dark">Set Up Your Business</h1>
          <p className="text-booqit-dark/70">Complete these steps to start accepting bookings</p>
        </div>

        {/* Progress indicators */}
        <div className="flex justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  index < currentStep 
                    ? 'bg-green-500 text-white' 
                    : index === currentStep 
                      ? 'bg-booqit-primary text-white' 
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentStep ? '✓' : index + 1}
              </div>
              <span className="text-xs mt-1 text-gray-600">{step.title}</span>
              
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="absolute w-[calc(100%/3)] h-0.5 bg-gray-200 left-1/3 transform translate-x-[calc(${index}*100%)]">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ 
                      width: index < currentStep ? '100%' : '0%',
                      transition: 'width 0.3s ease-in-out'
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>
              {currentStep === 0 && "Tell us about your business"}
              {currentStep === 1 && "Let customers know where to find you"}
              {currentStep === 2 && "Enter your bank details for receiving payments"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {renderStep()}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button 
                onClick={handleNext}
                className="bg-booqit-primary hover:bg-booqit-primary/90"
              >
                Continue
              </Button>
            ) : (
              <Button 
                onClick={handleComplete}
                className="bg-booqit-primary hover:bg-booqit-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Completing..." : "Complete Setup"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
