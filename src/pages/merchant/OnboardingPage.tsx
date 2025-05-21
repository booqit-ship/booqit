
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

import BankDetailsForm from '@/components/merchant/onboarding/BankDetailsForm';
import LocationForm from '@/components/merchant/onboarding/LocationForm';
import ShopInfoForm from '@/components/merchant/onboarding/ShopInfoForm';

// Define steps for onboarding
const steps = [
  { id: 'bank', title: 'Bank Details' },
  { id: 'location', title: 'Shop Location' },
  { id: 'info', title: 'Shop Information' }
];

const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [bankDetails, setBankDetails] = useState({
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
    description: '',
    open_time: '',
    close_time: '',
    image: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleComplete = () => {
    setIsSubmitting(true);
    
    // Simulated API call to save merchant data
    setTimeout(() => {
      setIsSubmitting(false);
      
      // Save completed state
      localStorage.setItem('booqit_onboarding_complete', 'true');
      
      // Show success message
      toast({
        title: "Onboarding Complete!",
        description: "Your merchant account is now set up.",
      });
      
      // Navigate to merchant dashboard
      navigate('/merchant');
    }, 1500);
  };

  // Render current step form
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <BankDetailsForm 
            bankDetails={bankDetails} 
            setBankDetails={setBankDetails} 
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
          <ShopInfoForm 
            shopInfo={shopInfo} 
            setShopInfo={setShopInfo} 
          />
        );
      default:
        return null;
    }
  };

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
              {currentStep === 0 && "Enter your bank details for receiving payments"}
              {currentStep === 1 && "Let customers know where to find you"}
              {currentStep === 2 && "Tell us about your business"}
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
