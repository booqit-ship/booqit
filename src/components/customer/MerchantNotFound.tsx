
import React from 'react';
import { Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const MerchantNotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4">
      <Frown className="h-16 w-16 text-gray-400 mb-4" aria-hidden />
      <h2 className="text-xl font-semibold mb-1 text-gray-700">Merchant not found</h2>
      <p className="text-gray-500 mb-4 text-center max-w-xs">
        We couldn’t find this shop. It may have been removed or the link was incorrect.
      </p>
      <Button onClick={() => navigate(-1)} className="mt-2">
        Go Back
      </Button>
    </div>
  );
};

export default MerchantNotFound;
